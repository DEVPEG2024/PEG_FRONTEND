import classNames from 'classnames'
import { APP_NAME } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'

interface LogoProps extends CommonProps {
    // wordmark : « PEG. » vectoriel sans marge transparente, net à toutes les
    // tailles (menu latéral, en-tête téléphone). Les PNG gardent leur cadrage.
    type?: 'full' | 'streamline' | 'wordmark'
    mode?: 'light' | 'dark'
    imgClass?: string
    imgStyle?: React.CSSProperties
    logoWidth?: number | string
}

const LOGO_SRC_PATH = '/img/logo/'

const Logo = (props: LogoProps) => {
    const {
        type = 'full',
        mode = 'light',
        className,
        imgClass,
        imgStyle,
        style,
        logoWidth = 'auto',
    } = props

    return (
        <div
            className={classNames('logo', className)}
            style={{
                ...style,
                ...{ width: logoWidth },
            }}
        >
            <img
                className={imgClass}
                style={imgStyle}
                src={
                    type === 'wordmark'
                        ? `${LOGO_SRC_PATH}logo-wordmark.svg`
                        : `${LOGO_SRC_PATH}logo-${mode}-${type}.png`
                }
                alt={`${APP_NAME} logo`}
            />
        </div>
    )
}

export default Logo
