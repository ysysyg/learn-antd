import * as React from 'react';
import { findDOMNode } from 'react-dom';
import TransitionEvents from 'css-animation/lib/Event';
import raf from './raf';
import { ConfigConsumer, ConfigConsumerProps, CSPConfig } from '../config-provider';

let styleForPesudo: HTMLStyleElement | null;

// Where el is the DOM element you'd like to test for visibility
function isHidden(element: HTMLElement) {
  if (process.env.NODE_ENV === 'test') {
    return false;
  }
  /**
   * 笔记
   *  https://www.runoob.com/jsref/dom-obj-all.html
   * 
   *  https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLElement/offsetParent
   */
  return !element || element.offsetParent === null;
}

function isNotGrey(color: string) {
  // eslint-disable-next-line no-useless-escape
  const match = (color || '').match(/rgba?\((\d*), (\d*), (\d*)(, [\.\d]*)?\)/);
  if (match && match[1] && match[2] && match[3]) {
    return !(match[1] === match[2] && match[2] === match[3]);
  }
  return true;
}

export default class Wave extends React.Component<{ insertExtraNode?: boolean }> {
  private instance?: {
    cancel: () => void;
  };

  private extraNode: HTMLDivElement;

  private clickWaveTimeoutId: number;

  private animationStartId: number;

  private animationStart: boolean = false;

  private destroy: boolean = false;

  private csp?: CSPConfig;

  componentDidMount() {
    const node = findDOMNode(this) as HTMLElement;
    /**
     * 笔记 findDOMNode 的参数 是 ReactInstance，这玩意是啥？https://www.w3cschool.cn/react_tutorial/of9v4ozt.html
     */
    if (!node || node.nodeType !== 1) {
      return;
    }
    this.instance = this.bindAnimationEvent(node); // 如果是元素节点，要做一件事，并且把这个元素传给这个要做事的函数
  }

  componentWillUnmount() {
    if (this.instance) {
      this.instance.cancel();
    }
    if (this.clickWaveTimeoutId) {
      clearTimeout(this.clickWaveTimeoutId);
    }

    this.destroy = true;
  }

  onClick = (node: HTMLElement, waveColor: string) => {
    if (!node || isHidden(node) || node.className.indexOf('-leave') >= 0) {
      return;
    }
    const { insertExtraNode } = this.props;
    this.extraNode = document.createElement('div');
    const { extraNode } = this;
    extraNode.className = 'ant-click-animating-node';
    const attributeName = this.getAttributeName();
    node.setAttribute(attributeName, 'true');
    // Not white or transparnt or grey
    styleForPesudo = styleForPesudo || document.createElement('style');
    if (
      waveColor &&
      waveColor !== '#ffffff' &&
      waveColor !== 'rgb(255, 255, 255)' &&
      isNotGrey(waveColor) &&
      !/rgba\(\d*, \d*, \d*, 0\)/.test(waveColor) && // any transparent rgba color
      waveColor !== 'transparent'
    ) {
      // Add nonce if CSP exist
      if (this.csp && this.csp.nonce) {
        styleForPesudo.nonce = this.csp.nonce;
      }

      extraNode.style.borderColor = waveColor;
      styleForPesudo.innerHTML = `
      [ant-click-animating-without-extra-node='true']::after, .ant-click-animating-node {
        --antd-wave-shadow-color: ${waveColor};
      }`;
      if (!document.body.contains(styleForPesudo)) {
        document.body.appendChild(styleForPesudo);
      }
    }
    if (insertExtraNode) {
      node.appendChild(extraNode);
    }
    TransitionEvents.addStartEventListener(node, this.onTransitionStart);
    TransitionEvents.addEndEventListener(node, this.onTransitionEnd);
  };

  onTransitionStart = (e: AnimationEvent) => {
    if (this.destroy) return;

    const node = findDOMNode(this) as HTMLElement;
    if (!e || e.target !== node) {
      return;
    }

    if (!this.animationStart) {
      this.resetEffect(node);
    }
  };

  onTransitionEnd = (e: AnimationEvent) => {
    if (!e || e.animationName !== 'fadeEffect') {
      return;
    }
    this.resetEffect(e.target as HTMLElement);
  };

  getAttributeName() {
    const { insertExtraNode } = this.props;
    return insertExtraNode ? 'ant-click-animating' : 'ant-click-animating-without-extra-node';
  }

  /**
   * 这个函数干的事情就是，给传进来的 dom 元素绑定 onclick 事件
   * 然后返回一个对象，该对象包含了能取消这个事情监听器的东西
   */
  bindAnimationEvent = (node: HTMLElement) => {
    if (
      !node ||
      !node.getAttribute ||
      node.getAttribute('disabled') ||
      node.className.indexOf('disabled') >= 0
    ) {
      return; // DOM 的 nodeType ，getAttribute 我都不熟呀
    }
    const onClick = (e: MouseEvent) => {
      // Fix radio button click twice
      /**
       * 笔记 https://developer.mozilla.org/zh-CN/docs/Web/API/Event/target
       */
      console.log('e.target ', e.target);
      if ((e.target as HTMLElement).tagName === 'INPUT' || isHidden(e.target as HTMLElement)) {
        return;
      }
      this.resetEffect(node);
      // Get wave color from target
      const waveColor =
        getComputedStyle(node).getPropertyValue('border-top-color') || // Firefox Compatible
        getComputedStyle(node).getPropertyValue('border-color') ||
        getComputedStyle(node).getPropertyValue('background-color');
      this.clickWaveTimeoutId = window.setTimeout(() => this.onClick(node, waveColor), 0);

      raf.cancel(this.animationStartId);
      this.animationStart = true;

      // Render to trigger transition event cost 3 frames. Let's delay 10 frames to reset this.
      this.animationStartId = raf(() => {
        this.animationStart = false;
      }, 10);
    };
    /**
     * addEventListener 和 removeEventListener 我也不太清楚，之前都是 document.addEventListener
     *  https://www.runoob.com/jsref/met-element-addeventlistener.html
     */
    node.addEventListener('click', onClick, true);
    return {
      cancel: () => {
        node.removeEventListener('click', onClick, true);
      },
    };
  };

  resetEffect(node: HTMLElement) {
    if (!node || node === this.extraNode || !(node instanceof Element)) {
      return;
    }
    const { insertExtraNode } = this.props;
    const attributeName = this.getAttributeName();
    node.setAttribute(attributeName, 'false'); // edge has bug on `removeAttribute` #14466

    if (styleForPesudo) {
      styleForPesudo.innerHTML = '';
    }

    if (insertExtraNode && this.extraNode && node.contains(this.extraNode)) {
      node.removeChild(this.extraNode);
    }
    TransitionEvents.removeStartEventListener(node, this.onTransitionStart);
    TransitionEvents.removeEndEventListener(node, this.onTransitionEnd);
  }

  renderWave = ({ csp }: ConfigConsumerProps) => {
    const { children } = this.props;
    this.csp = csp;

    return children;
  };

  render() {
    return <ConfigConsumer>{this.renderWave}</ConfigConsumer>;
  }
}
