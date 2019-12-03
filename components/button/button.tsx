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

/**
 * 
 * https://codesandbox.io/s/serene-proskuriakova-yf6es
 * 
 */

/**
 * 
 *  this.props.children 知识点
 *    1. children 可以是字符串，可以是数字，也可以是 <div /> 或 <Wave />
 *    2. 前两者对应的 ts类型是 ReactText，后两者对应的 ts类型就是 ReactElement
 *    3. ReactElement + ReactText = ReactChild
 */
function insertSpace(child: React.ReactChild, needInserted: boolean) {
  // Check the child if is undefined or null.
  if (child == null) { // 4. 这个偶早就知道了
    return;
  }
  const SPACE = needInserted ? ' ' : '';
  // strictNullChecks oops.
  if (
    typeof child !== 'string' &&
    typeof child !== 'number' &&
    isString(child.type) && // 一个 ReactElement 的 type 可能是字符串也可能是函数
    isTwoCNChar(child.props.children) // 这一步和上一步就是锁定 child 是不是这个样子 <Comp>只有字符串</Comp>
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

// type ReactNode = ReactChild | ReactFragment | ReactPortal | boolean | null | undefined;
/**
 * 
 * interface ReactPortal extends ReactElement {
      key: Key | null;
      children: ReactNode;
    }

    关于 ReactNode 也许能从这找答案 https://zhuanlan.zhihu.com/p/57544233
 * 
 */
function spaceChildren(children: React.ReactNode, needInserted: boolean) {
  let isPrevChildPure: boolean = false;
  const childList: React.ReactNode[] = [];
  // 9. 又遇到了一个新的 React.Children 上的方法
  // 对 React children 的深入理解 https://www.jianshu.com/p/d1975493b5ea/
  React.Children.forEach(children, child => {
    // 10. 占位符
    const type = typeof child;
    const isCurrentChildPure = type === 'string' || type === 'number';
    if (isPrevChildPure && isCurrentChildPure) {
      const lastIndex = childList.length - 1;
      const lastChild = childList[lastIndex];
      childList[lastIndex] = `${lastChild}${child}`;
    } else {
      childList.push(child);
    }

    isPrevChildPure = isCurrentChildPure;
  });

  // Pass to React.Children.map to auto fill key
  // 11. 占位符
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
  loading?: boolean | { delay?: number };
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
  static Group: typeof Group;

  static __ANT_BUTTON = true;

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

  private buttonNode: HTMLElement | null;

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

  componentDidUpdate(prevProps: ButtonProps) {
    this.fixTwoCNChar();

    if (prevProps.loading && typeof prevProps.loading !== 'boolean') {
      clearTimeout(this.delayTimeout);
    }

    const { loading } = this.props;
    if (loading && typeof loading !== 'boolean' && loading.delay) {
      this.delayTimeout = window.setTimeout(() => {
        this.setState({ loading });
      }, loading.delay);
    } else if (prevProps.loading !== loading) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ loading });
    }
  }

  componentWillUnmount() {
    if (this.delayTimeout) {
      clearTimeout(this.delayTimeout);
    }
  }

  saveButtonRef = (node: HTMLElement | null) => {
    this.buttonNode = node;
  };

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
  
  // 纠正 this.state.hasTwoCNChar 的值
  fixTwoCNChar() {
    // Fix for HOC usage like <FormatMessage />

    if (!this.buttonNode) {
      return;
    }
    // 13. textContent 和 innerText, 又学到了
    // buttonNode 是 HTMLElement
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
    // 14. React.Children.count
    // React.Children.count()用来计数，返回child个数。不要用children.length来计数，如果Father组件里只有'hello world!'会返回12，显然是错误的结果。
    // https://www.cnblogs.com/chen-cong/p/10371329.html
    return React.Children.count(children) === 1 && !icon && type !== 'link';
  }

  renderButton = ({ getPrefixCls, autoInsertSpaceInButton }: ConfigConsumerProps) => {
    const {
      prefixCls: customizePrefixCls,
      type,
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

    const classes = classNames(prefixCls, className, { // 16. 这个取名叫 classes 我喜欢
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
    const kids =
      children || children === 0 // 17. children === 0 是什么判断？children 可能是个文本节点，正好是0
        ? spaceChildren(children, this.isNeedInserted() && autoInsertSpace)
        : null;

    const linkButtonRestProps = omit(rest as AnchorButtonProps, ['htmlType', 'loading']);
    if (linkButtonRestProps.href !== undefined) {
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
