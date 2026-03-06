import { cloneElement } from 'react'
import Logo from '@/components/template/Logo'
import { APP_NAME } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'

interface SideProps extends CommonProps {
    content?: React.ReactNode
}

const Side = ({ children, content, ...rest }: SideProps) => {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', height: '100%', fontFamily: 'Inter, sans-serif', background: '#07101f' }}>
            {/* Left panel */}
            <div style={{
                background: 'linear-gradient(160deg, #0d1e35 0%, #07101f 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '40px 48px',
                position: 'relative',
                overflow: 'hidden',
                borderRight: '1px solid rgba(255,255,255,0.05)',
            }}>
                {/* Decorative glows */}
                <div style={{
                    position: 'absolute', top: '-80px', left: '-80px',
                    width: '360px', height: '360px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(47,111,237,0.18) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '-60px', right: '-60px',
                    width: '280px', height: '280px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(47,111,237,0.1) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                {/* Logo */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <Logo mode="dark" />
                </div>

                {/* Center content */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        background: 'rgba(47,111,237,0.12)', border: '1px solid rgba(47,111,237,0.25)',
                        borderRadius: '100px', padding: '5px 14px', marginBottom: '24px',
                    }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2f6fed' }} />
                        <span style={{ color: '#6b9eff', fontSize: '12px', fontWeight: 600, letterSpacing: '0.05em' }}>
                            Plateforme de gestion
                        </span>
                    </div>
                    <h1 style={{
                        color: '#fff', fontSize: '32px', fontWeight: 700,
                        letterSpacing: '-0.03em', lineHeight: 1.2, marginBottom: '16px',
                    }}>
                        Gérez vos projets<br />
                        <span style={{ color: '#6b9eff' }}>simplement.</span>
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', lineHeight: 1.6, maxWidth: '320px' }}>
                        Suivez vos commandes, collaborez avec vos équipes et pilotez vos projets en temps réel.
                    </p>
                </div>

                {/* Footer */}
                <div style={{ position: 'relative', zIndex: 1 }}>
                    <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>
                        © {new Date().getFullYear()} <span style={{ fontWeight: 600 }}>{APP_NAME}</span>
                    </p>
                </div>
            </div>

            {/* Right panel */}
            <div style={{
                background: 'linear-gradient(160deg, #0a1628 0%, #07101f 100%)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '40px 32px',
            }}>
                <div style={{ width: '100%', maxWidth: '400px' }}>
                    <div style={{ marginBottom: '8px' }}>{content}</div>
                    {children
                        ? cloneElement(children as React.ReactElement, { ...rest })
                        : null}
                </div>
            </div>
        </div>
    )
}

export default Side
