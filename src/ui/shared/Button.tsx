import type { ComponentChildren, JSX } from 'preact';
import styles from './Button.module.css';

interface ButtonProps {
    children: ComponentChildren;
    active?: boolean;
    ariaControls?: string;
    ariaDescribedBy?: string;
    ariaExpanded?: boolean;
    ariaPressed?: boolean;
    ariaSelected?: boolean;
    className?: string;
    dataTestId?: string;
    disabled?: boolean;
    id?: string;
    onBlur?: JSX.FocusEventHandler<HTMLButtonElement>;
    onClick?: JSX.MouseEventHandler<HTMLButtonElement>;
    onFocus?: JSX.FocusEventHandler<HTMLButtonElement>;
    onMouseEnter?: JSX.MouseEventHandler<HTMLButtonElement>;
    onMouseLeave?: JSX.MouseEventHandler<HTMLButtonElement>;
    onPointerDown?: JSX.PointerEventHandler<HTMLButtonElement>;
    role?: JSX.AriaRole;
    tabIndex?: number;
    type?: 'button' | 'submit' | 'reset';
    variant?: 'tab' | 'tool' | 'ghost' | 'primary';
}

export default function Button({
    children,
    active = false,
    ariaControls,
    ariaDescribedBy,
    ariaExpanded,
    ariaPressed,
    ariaSelected,
    className = '',
    dataTestId,
    disabled = false,
    id,
    onBlur,
    onClick,
    onFocus,
    onMouseEnter,
    onMouseLeave,
    onPointerDown,
    role,
    tabIndex = -1,
    type = 'button',
    variant = 'ghost'
}: ButtonProps) {
    return (
        <button
            aria-controls={ariaControls}
            aria-describedby={ariaDescribedBy}
            aria-expanded={ariaExpanded}
            aria-pressed={ariaPressed}
            aria-selected={ariaSelected}
            class={`${styles.button} ${styles[variant]} ${active ? styles.active : ''} ${className}`}
            data-testid={dataTestId}
            disabled={disabled}
            id={id}
            onBlur={onBlur}
            onClick={onClick}
            onFocus={onFocus}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onPointerDown={onPointerDown}
            role={role}
            tabIndex={tabIndex}
            type={type}
        >
            {children}
        </button>
    );
}
