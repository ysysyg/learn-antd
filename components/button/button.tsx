/* eslint-disable react/button-has-type */
import * as React from 'react';
import * as PropTypes from 'prop-types';
import classNames from 'classnames';
import { polyfill } from 'react-lifecycles-compat';
import omit from 'omit.js';
import Group from './button-group';
import Icon from '../icon';
import { ConfigConsumer, ConfigConsumerProps } from '../config-provider';
import Wave from '../_util/wave';
import { Omit, tuple } from '../_util/type';

const rxTwoCNChar = /^[\u4e00-\u9fa5]{2}$/; // 1. \u4e00 和 \u9fa5 是unicode编码，并且正好是中文编码的开始和结束的两个值
const isTwoCNChar = rxTwoCNChar.test.bind(rxTwoCNChar); // 2. 为什么不直接调用正则的 test 方法，还要 bind 一下？
function isString(str: any) {
  return typeof str === 'string';
}



// Insert one space between two chinese characters automatically.
function insertSpace(child: React.ReactChild, needInserted: boolean) {
  // Check the child if is undefined or null.
  if (child == null) {
    return;
  }
  const SPACE = needInserted ? ' ' : '';
  // strictNullChecks oops.
  
  /**
   * 参数是 child，一个子元素，一个子元素有几种样子，开动你的小脑瓜 （string | number | true | ReactElement）
   * 
   * ReactElement 是什么？是一个对象，这个对象有 type、props、key 等属性，如果是 <div /> 它 type 是字符串，如果是 <Comp /> 它的 type 是 函数
   *  https://codesandbox.io/s/blissful-liskov-srv04
   */
  if ( // child 是一个 ReactElement
    typeof child !== 'string' &&
    typeof child !== 'number' &&
    isString(child.type) &&
    isTwoCNChar(child.props.children) // child.props.children 好像可能不是一个字符串，也有可能也是一个 ReactElement
  ) {
    /**
     * 通过👆if 语句的分析，我们已经判断出能进到这里的是 ReactElement
     * 👇的 cloneElement 进一步佐证了我们的判断
     * 
     * cloneElement 方法使用详解 https://www.jianshu.com/p/2ccf0cd14388
     */
    // 这句代码挺好的，用到 cloneElement 第三个参数的示例不多
    return React.cloneElement(child, {}, child.props.children.split('').join(SPACE));
  }
  if (typeof child === 'string') {
    if (isTwoCNChar(child)) {
      child = child.split('').join(SPACE);
    }
    return <span>{child}</span>;
  }
  // 走到这里说明 child 是 number 类型
  return child;
}

// 对 React children 的深入理解 https://www.jianshu.com/p/d1975493b5ea/
// ReactNode 是什么类型？也许能从这找答案 https://zhuanlan.zhihu.com/p/57544233
function spaceChildren(children: React.ReactNode, needInserted: boolean) {
  let isPrevChildPure: boolean = false;
  const childList: React.ReactNode[] = [];
  /**
   * 
   * 不管 props.children 是字符串、对象还是数组
   * React.Children.map 都能把 children 当成一个数组来处理，最终也返回一个数组
   * 该 api 示例请看 https://codesandbox.io/s/vibrant-rain-oo9iu
   * 
   * 既然 Children.map 对各种类型的 children 处理都很强大，为什么还需要 Children.forEach 工具函数呢？
   * 答案去👇的 lastIndex 和 lastChild 那块找
   */
  React.Children.forEach(children, child => {
    const type = typeof child;
    const isCurrentChildPure = type === 'string' || type === 'number';
    /**
     *  if 块是针对 <div>{123}{123}</div> ，这种情况 react 算它的 children 个数为2
     *  antd 不愧是库，边界处理算是到极致了
     *  如果是 {123}{123} 这样的把它变成 {123123}
     */
    if (isPrevChildPure && isCurrentChildPure) {
      // 为什么这里不能直接 push，需要找下标？å
      // 有没有可能是这样的 {abc}{def}, 这个样子的 react 算的是两个 children
      const lastIndex = childList.length - 1;
      const lastChild = childList[lastIndex];
      childList[lastIndex] = `${lastChild}${child}`;
    } else {
      // 能进到 else 分支说明要么是 ReactElement 要么是第一个 child
      // 这时我想到 children 是复数，this.props.children 不就是暗示你可以传多个子元素吗 
      childList.push(child);
    }

    isPrevChildPure = isCurrentChildPure;
  });

  // Pass to React.Children.map to auto fill key
  return React.Children.map(childList, child =>
    insertSpace(child as React.ReactChild, needInserted),
  );
}

// 12. 虽然还没有完全掌握 tuple, 但感觉挺妙的, 如果不这么写怎么写？
const ButtonTypes = tuple('default', 'primary', 'ghost', 'dashed', 'danger', 'link');
export type ButtonType = (typeof ButtonTypes)[number];
const ButtonShapes = tuple('circle', 'circle-outline', 'round');
export type ButtonShape = (typeof ButtonShapes)[number];
const ButtonSizes = tuple('large', 'default', 'small');
export type ButtonSize = (typeof ButtonSizes)[number];
const ButtonHTMLTypes = tuple('submit', 'button', 'reset');
export type ButtonHTMLType = (typeof ButtonHTMLTypes)[number];

export interface BaseButtonProps {
  type?: ButtonType;
  icon?: string;
  shape?: ButtonShape;
  size?: ButtonSize;
  loading?: boolean | { delay?: number }; // props 上的 loading 有两种类型
  prefixCls?: string;
  className?: string;
  ghost?: boolean;
  block?: boolean;
  children?: React.ReactNode;
}

// Typescript will make optional not optional if use Pick with union.
// Should change to `AnchorButtonProps | NativeButtonProps` and `any` to `HTMLAnchorElement | HTMLButtonElement` if it fixed.
// ref: https://github.com/ant-design/ant-design/issues/15930

// 12. 这个类型定义也没有看太懂
export type AnchorButtonProps = {
  href: string;
  target?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
} & BaseButtonProps &
  Omit<React.AnchorHTMLAttributes<any>, 'type' | 'onClick'>;

export type NativeButtonProps = {
  htmlType?: ButtonHTMLType;
  onClick?: React.MouseEventHandler<HTMLElement>;
} & BaseButtonProps &
  Omit<React.ButtonHTMLAttributes<any>, 'type' | 'onClick'>;

export type ButtonProps = Partial<AnchorButtonProps & NativeButtonProps>;

interface ButtonState {
  loading?: boolean | { delay?: number };
  hasTwoCNChar: boolean;
}

class Button extends React.Component<ButtonProps, ButtonState> {
  static Group: typeof Group; // 一个 ts 亮点，这里只是定义了静态属性，赋值在 index.tsx 文件中完成的

  static __ANT_BUTTON = true; // 咦，原来还有这个东东，估计其他组件也可能有这玩意

  static defaultProps = {
    loading: false,
    ghost: false,
    block: false,
    htmlType: 'button',
  };

  static propTypes = {
    type: PropTypes.string,
    shape: PropTypes.oneOf(ButtonShapes),
    size: PropTypes.oneOf(ButtonSizes),
    htmlType: PropTypes.oneOf(ButtonHTMLTypes),
    onClick: PropTypes.func,
    loading: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
    className: PropTypes.string,
    icon: PropTypes.string,
    block: PropTypes.bool,
    title: PropTypes.string,
  };

  private delayTimeout: number;

  private buttonNode: HTMLElement | null; // buttonNode 是真实的 dom 元素

  constructor(props: ButtonProps) {
    super(props);
    this.state = {
      loading: props.loading,
      hasTwoCNChar: false,
    };
  }

  componentDidMount() {
    this.fixTwoCNChar();
  }

  /**
   * 现在前后 props 的变化，都放到 componentDidUpdate 里来做了
   * 搜了下全局，antd 里面已经没有 componentWillReceiveProps 方法了
   * 
   * 这个方法里面没啥可看的，下一个
   */
  componentDidUpdate(prevProps: ButtonProps) {
    this.fixTwoCNChar();

    if (prevProps.loading && typeof prevProps.loading !== 'boolean') {
      // 说明上次 loading 是 delay，那要把上次的定时器清理掉
      clearTimeout(this.delayTimeout);
    }

    const { loading } = this.props;
    if (loading && typeof loading !== 'boolean' && loading.delay) {
      // 本次 loading 设置了 delay，要开启一个定时器
      this.delayTimeout = window.setTimeout(() => {
        this.setState({ loading });
      }, loading.delay);
    } else if (prevProps.loading !== loading) {
      // eslint-disable-next-line react/no-did-update-set-state

      // 本次 loading 是 boolean, 上次 loading 可能是 boolean 也有可能是 delay
      this.setState({ loading });
    }
  }

  componentWillUnmount() {
    if (this.delayTimeout) {
      clearTimeout(this.delayTimeout);
    }
  }

  // 要保存按钮的真实 DOM 节点，因为 fixTwoCNChar 方法要用
  saveButtonRef = (node: HTMLElement | null) => {
    this.buttonNode = node;
  };

  // 这个 ts 类型值得一探究竟
  handleClick: React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement> = e => {
    const { loading } = this.state;
    const { onClick } = this.props;
    if (loading) {
      return;
    }
    if (onClick) {
      (onClick as React.MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>)(e);
    }
  };
  
  fixTwoCNChar() {
    // Fix for HOC usage like <FormatMessage />

    // 这个真实DOM 元素不存在，下面没法玩
    if (!this.buttonNode) {
      return;
    }
    
    // buttonNode 看👈截图
    /**
     *  原来还有 textContent 呀
     *  https://www.runoob.com/jsref/prop-node-textcontent.html
     * 
     */
    const buttonText = this.buttonNode.textContent || this.buttonNode.innerText;
    if (this.isNeedInserted() && isTwoCNChar(buttonText)) {
      if (!this.state.hasTwoCNChar) {
        this.setState({
          hasTwoCNChar: true,
        });
      }
    } else if (this.state.hasTwoCNChar) {
      this.setState({
        hasTwoCNChar: false,
      });
    }
  }

  isNeedInserted() {
    const { icon, children, type } = this.props;
    return React.Children.count(children) === 1 && !icon && type !== 'link';
  }

  /**
   *  这个主绘制方法可以学到
   *    1. props.children 比较灵活，可以是任意 js 表达式，如函数，renderButton 函数就是作为 <ConfigConsumer> 的 children
   *    2. 深入理解 spaceChildren 
   *    3. kids 返回的到底是啥类型
   */
  renderButton = ({ getPrefixCls, autoInsertSpaceInButton }: ConfigConsumerProps) => {
    const {
      prefixCls: customizePrefixCls,
      type, // 因为 React 把 type 给它用来写 primary、danger 等了，所以原生 button 的 type 就用 htmlType 属性来表示
      shape,
      size,
      className,
      children,
      icon,
      ghost,
      block,
      ...rest
    } = this.props;
    const { loading, hasTwoCNChar } = this.state;

    const prefixCls = getPrefixCls('btn', customizePrefixCls);
    const autoInsertSpace = autoInsertSpaceInButton !== false; // 15. 直接 !!autoInsertSpaceInButton 不就好了吗，为什么要这么骚

    // large => lg
    // small => sm
    let sizeCls = '';
    switch (size) {
      case 'large':
        sizeCls = 'lg';
        break;
      case 'small':
        sizeCls = 'sm';
        break;
      default:
        break;
    }

    const iconType = loading ? 'loading' : icon;

    // 这个取名 classes 我喜欢
    const classes = classNames(prefixCls, className, {
      [`${prefixCls}-${type}`]: type,
      [`${prefixCls}-${shape}`]: shape,
      [`${prefixCls}-${sizeCls}`]: sizeCls,
      [`${prefixCls}-icon-only`]: !children && children !== 0 && iconType,
      [`${prefixCls}-loading`]: !!loading,
      [`${prefixCls}-background-ghost`]: ghost,
      [`${prefixCls}-two-chinese-chars`]: hasTwoCNChar && autoInsertSpace,
      [`${prefixCls}-block`]: block,
    });

    const iconNode = iconType ? <Icon type={iconType} /> : null;

    // 使用 button 组件的时候，可以不传 children，比如 <Button shape="circle" icon="search" />
    // ??? kids 返回的是什么 ???
    const kids =
      children || children === 0 // children 可能恰好是数字 0
        ? spaceChildren(children, this.isNeedInserted() && autoInsertSpace)
        : null;

    const linkButtonRestProps = omit(rest as AnchorButtonProps, ['htmlType', 'loading']);

    if (linkButtonRestProps.href !== undefined) {
      /**
       * 如果有 href，button 就替换成 a 标签
       */
      return (
        <a
          {...linkButtonRestProps}
          className={classes}
          onClick={this.handleClick}
          ref={this.saveButtonRef}
        >
          {iconNode}
          {kids}
        </a>
      );
    }

    // React does not recognize the `htmlType` prop on a DOM element. Here we pick it out of `rest`.
    const { htmlType, ...otherProps } = rest as NativeButtonProps;

    const buttonNode = (
      <button
        {...(omit(otherProps, ['loading']) as NativeButtonProps)}
        type={htmlType}
        className={classes}
        onClick={this.handleClick}
        ref={this.saveButtonRef}
      >
        {iconNode}
        {kids}
      </button>
    );

    if (type === 'link') {
      // 目前来看 link 就是不要波纹效果的 button
      return buttonNode;
    }

    return <Wave>{buttonNode}</Wave>;
  };

  render() {
    return <ConfigConsumer>{this.renderButton}</ConfigConsumer>;
  }
}

polyfill(Button);

export default Button;
