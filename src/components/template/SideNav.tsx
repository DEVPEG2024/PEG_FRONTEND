import classNames from 'classnames'
import ScrollBar from '@/components/ui/ScrollBar'
import {
    SIDE_NAV_WIDTH,
    SIDE_NAV_COLLAPSED_WIDTH,
    NAV_MODE_DARK,
    NAV_MODE_THEMED,
    NAV_MODE_TRANSPARENT,
    SIDE_NAV_CONTENT_GUTTER,
    LOGO_X_GUTTER,
} from '@/constants/theme.constant'
import Logo from '@/components/template/Logo'
import navigationConfig from '@/configs/navigation.config'
import CustomVerticalMenu from '@/components/template/CustomVerticalMenu'
import useResponsive from '@/utils/hooks/useResponsive'
import { useAppSelector } from '@/store'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { TbSparkles, TbArrowRight, TbCrown } from 'react-icons/tb'

const PremiumCard = () => (
    <div style={{ padding: '12px 16px 0', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
            background: 'linear-gradient(160deg, rgba(234,179,8,0.14) 0%, rgba(255,255,255,0.03) 100%)',
            border: '1px solid rgba(234,179,8,0.3)',
            borderRadius: '16px',
            padding: '16px',
        }}>
            <div style={{
                width: '34px', height: '34px', borderRadius: '10px',
                background: 'rgba(234,179,8,0.18)', border: '1px solid rgba(234,179,8,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
            }}>
                <TbCrown size={18} color="#eab308" />
            </div>
            <p style={{ margin: 0, color: '#fff', fontSize: '13px', fontWeight: 700, lineHeight: 1.3 }}>
                Passez en Premium
            </p>
            <p style={{ margin: '4px 0 14px', color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: 1.4 }}>
                -15% sur le catalogue + vos offres personnalisées.
            </p>
            <Link to="/customer/premium" style={{ textDecoration: 'none' }}>
                <button style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: 'rgba(234,179,8,0.16)', border: '1px solid rgba(234,179,8,0.3)',
                    borderRadius: '10px', padding: '9px 12px',
                    color: '#fde68a', fontSize: '12.5px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
                }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(234,179,8,0.28)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(234,179,8,0.16)')}
                >
                    Passer en Premium
                    <TbArrowRight size={15} color="#eab308" strokeWidth={2} />
                </button>
            </Link>
        </div>
    </div>
)

const QuoteCard = () => (
    <div style={{ padding: '12px 16px 240px', fontFamily: 'Inter, sans-serif' }}>
        <div style={{
            background: 'linear-gradient(160deg, rgba(139,92,246,0.12) 0%, rgba(255,255,255,0.03) 100%)',
            border: '1px solid rgba(139,92,246,0.25)',
            borderRadius: '16px',
            padding: '16px',
        }}>
            <div style={{
                width: '34px', height: '34px', borderRadius: '10px',
                background: 'rgba(139,92,246,0.18)', border: '1px solid rgba(139,92,246,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px',
            }}>
                <TbSparkles size={18} color="#a78bfa" />
            </div>
            <p style={{ margin: 0, color: '#fff', fontSize: '13px', fontWeight: 700, lineHeight: 1.3 }}>
                Besoin d'un projet sur-mesure ?
            </p>
            <p style={{ margin: '4px 0 14px', color: 'rgba(255,255,255,0.5)', fontSize: '12px', lineHeight: 1.4 }}>
                Notre équipe vous accompagne.
            </p>
            <Link to="/customer/devis" style={{ textDecoration: 'none' }}>
                <button style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px', padding: '9px 12px',
                    color: '#fff', fontSize: '12.5px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif', transition: 'background 0.15s',
                }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(139,92,246,0.2)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                >
                    Demander un devis
                    <TbArrowRight size={15} color="#a78bfa" strokeWidth={2} />
                </button>
            </Link>
        </div>
    </div>
)

const sideNavStyle = {
    width: SIDE_NAV_WIDTH,
    minWidth: SIDE_NAV_WIDTH,
}

const sideNavCollapseStyle = {
    width: SIDE_NAV_COLLAPSED_WIDTH,
    minWidth: SIDE_NAV_COLLAPSED_WIDTH,
}

const SideNav = () => {
    const themeColor = useAppSelector((state) => state.theme.themeColor)
    const primaryColorLevel = useAppSelector(
        (state) => state.theme.primaryColorLevel
    )
    const navMode = useAppSelector((state) => state.theme.navMode)
    const mode = useAppSelector((state) => state.theme.mode)
    const direction = useAppSelector((state) => state.theme.direction)
    const sideNavCollapse = useAppSelector(
        (state) => state.theme.layout.sideNavCollapse
    )
    const userAuthority = useAppSelector((state) => state.auth.user.user.authority)
    const customer = useAppSelector((state) => state.auth.user.user?.customer)

    const { larger } = useResponsive()

    const filteredNav = useMemo(() => {
        if (customer && customer.catalogAccess === false) {
            return navigationConfig.filter(
                (item) => item.key !== 'customer.catalogue' && item.key !== 'customer.products'
            )
        }
        return navigationConfig
    }, [customer])

    const sideNavColor = () => {
        if (navMode === NAV_MODE_THEMED) {
            return `bg-${themeColor}-${primaryColorLevel} side-nav-${navMode}`
        }
        return `side-nav-${navMode}`
    }

    const logoMode = () => {
        if (navMode === NAV_MODE_THEMED) {
            return NAV_MODE_DARK
        }

        if (navMode === NAV_MODE_TRANSPARENT) {
            return mode
        }

        return navMode
    }

    const menuContent = (
        <CustomVerticalMenu
            navigationTree={filteredNav}
            userAuthority={userAuthority as string[]}
            collapsed={sideNavCollapse}
        />
    )

    return (
        <>
            {larger.md && (
                <div
                    style={
                        sideNavCollapse ? sideNavCollapseStyle : sideNavStyle
                    }
                    className={classNames(
                        'side-nav',
                        sideNavColor(),
                        !sideNavCollapse && 'side-nav-expand'
                    )}
                >
                    <div className="side-nav-header">
                        <Logo
                            mode={logoMode()}
                            type={sideNavCollapse ? 'streamline' : 'full'}
                            className={
                                sideNavCollapse
                                    ? SIDE_NAV_CONTENT_GUTTER
                                    : LOGO_X_GUTTER
                            }
                        />
                    </div>
                    {sideNavCollapse ? (
                        menuContent
                    ) : (
                        <div
                            className="side-nav-content"
                            style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                        >
                            <div style={{ flex: 1, minHeight: 0 }}>
                                <ScrollBar autoHide direction={direction}>
                                    {menuContent}
                                </ScrollBar>
                            </div>
                            {customer && !customer.premium && <PremiumCard />}
                            {customer && <QuoteCard />}
                        </div>
                    )}
                </div>
            )}
        </>
    )
}

export default SideNav
