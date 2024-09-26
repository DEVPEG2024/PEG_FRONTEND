import classNames from 'classnames'
import type { CommonProps } from '@/@types/common'
import type { ReactNode, ElementType } from 'react'
import { BsFolderX } from 'react-icons/bs'

export interface IconTextProps extends CommonProps {
    icon?: ReactNode | string
    asElement?: ElementType
}

const Empty = ({
    className,
    asElement: Component = 'span',
    icon,
    children,
}: IconTextProps) => {
    return (
        
        <Component className={classNames('flex flex-col items-center gap-2 mt-10', className)}>
            {icon}
            {children}
        </Component>
    )
}

export default Empty
