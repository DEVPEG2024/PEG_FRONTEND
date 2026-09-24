import classNames from 'classnames'
import { APP_NAME } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'

interface LogoProps extends CommonProps {
    type?: 'full' | 'streamline'
    /** Fond sur lequel le logo est posé : `dark` → logo blanc, `light` → logo sombre. */
    mode?: 'light' | 'dark'
    /** `violet` : version monochrome violette, quel que soit le fond. */
    variant?: 'violet'
    imgClass?: string
    imgStyle?: React.CSSProperties
    logoWidth?: number | string
}

const LOGO_SRC_PATH = '/img/logo/'

/* Logo PEG (24/09/2026) — règle : logo SOMBRE sur fond CLAIR, logo BLANC sur
   fond SOMBRE. `mode` décrit le fond (même sens que le thème / navMode), pas la
   couleur du logo. SVG : net à toutes les tailles. */
const LOGO_FILE = {
    dark: 'peg-logo-white.svg',
    light: 'peg-logo-dark.svg',
    violet: 'peg-logo-violet.svg',
} as const

/* Largeur par défaut : hauteur visuelle proche de l'ancien logo (≈ 45 px) ;
   `streamline` tient dans le menu replié (80 px moins les marges). */
const DEFAULT_WIDTH = { full: 150, streamline: 48 } as const

const Logo = (props: LogoProps) => {
    const {
        type = 'full',
        mode = 'light',
        variant,
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
                style={{
                    width: DEFAULT_WIDTH[type],
                    maxWidth: '100%',
                    height: 'auto',
                    ...imgStyle,
                }}
                src={`${LOGO_SRC_PATH}${LOGO_FILE[variant ?? mode]}`}
                alt={`${APP_NAME} logo`}
            />
        </div>
    )
}

export default Logo
