import { forwardRef } from 'react'
import classNames from 'classnames'
import type { CommonProps } from '../@types/common'
import type { ElementType } from 'react'

export interface SkeletonProps extends CommonProps {
    animation?: boolean
    asElement?: ElementType
    height?: string | number
    variant?: 'block' | 'circle'
    width?: string | number
}

const Skeleton = forwardRef<ElementType, SkeletonProps>((props, ref) => {
    const {
        animation = true,
        asElement: Component = 'span',
        className,
        height,
        style,
        variant = 'block',
        width,
    } = props

    return (
        <Component
            ref={ref}
            className={classNames(
                'skeleton',
                'relative overflow-hidden',
                variant === 'circle' && 'skeleton-circle',
                variant === 'block' && 'skeleton-block',
                animation && 'animate-pulse',
                className
            )}
            style={{
                width,
                height,
                ...style,
            }}
        >
            {animation && (
                <div className="skeleton-shimmer absolute inset-0 rounded-[inherit]" />
            )}
        </Component>
    )
})

Skeleton.displayName = 'Skeleton'

export default Skeleton
