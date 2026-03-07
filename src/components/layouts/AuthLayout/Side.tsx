import { cloneElement } from 'react'
import Logo from '@/components/template/Logo'
import { APP_NAME } from '@/constants/app.constant'
import type { CommonProps } from '@/@types/common'

interface SideProps extends CommonProps {
    content?: React.ReactNode
}

const Side = ({ children, content, ...rest }: SideProps) => {
    return (
        <div
            style={{
                minHeight: '100vh',
                background: '#05101e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
                fontFamily: 'Inter, sans-serif',
                // Dot grid
                backgroundImage:
                    'radial-gradient(rgba(255,255,255,0.035) 1px, transparent 1px)',
                backgroundSize: '28px 28px',
            }}
        >
            {/* Ambient glow — top right */}
            <div
                style={{
                    position: 'absolute',
                    top: '-120px',
                    right: '-120px',
                    width: '560px',
                    height: '560px',
                    borderRadius: '50%',
                    background:
                        'radial-gradient(circle, rgba(47,111,237,0.13) 0%, transparent 60%)',
                    pointerEvents: 'none',
                }}
            />
            {/* Ambient glow — bottom left */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '-100px',
                    left: '-100px',
                    width: '440px',
                    height: '440px',
                    borderRadius: '50%',
                    background:
                        'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 60%)',
                    pointerEvents: 'none',
                }}
            />
            {/* Ambient glow — center subtle */}
            <div
                style={{
                    position: 'absolute',
                    top: '40%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    background:
                        'radial-gradient(circle, rgba(47,111,237,0.05) 0%, transparent 55%)',
                    pointerEvents: 'none',
                }}
            />

            {/* Floating card */}
            <div
                style={{
                    width: '100%',
                    maxWidth: '460px',
                    margin: '24px',
                    background:
                        'linear-gradient(160deg, rgba(12,26,48,0.96) 0%, rgba(6,14,28,0.98) 100%)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    borderRadius: '24px',
                    padding: '40px 40px 28px',
                    position: 'relative',
                    zIndex: 1,
                    boxShadow:
                        '0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(47,111,237,0.06) inset',
                }}
            >
                {/* Top accent line */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: '60px',
                        right: '60px',
                        height: '1.5px',
                        background:
                            'linear-gradient(90deg, transparent, rgba(47,111,237,0.7), rgba(99,102,241,0.5), transparent)',
                        borderRadius: '100px',
                    }}
                />

                {/* Logo */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        marginBottom: '36px',
                    }}
                >
                    <Logo mode="light" style={{ display: 'block', margin: '0 auto' }} />
                </div>

                {/* Page content */}
                <div>
                    <div>{content}</div>
                    {children
                        ? cloneElement(children as React.ReactElement, { ...rest })
                        : null}
                </div>

                {/* Divider */}
                <div
                    style={{
                        height: '1px',
                        background: 'rgba(255,255,255,0.05)',
                        margin: '28px 0 20px',
                    }}
                />

                {/* Trust badges */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '20px',
                        flexWrap: 'wrap',
                    }}
                >
                    {[
                        { icon: '🔒', label: 'Connexion sécurisée' },
                        { icon: '⚡', label: 'Accès instantané' },
                        { icon: '🇫🇷', label: 'Données en France' },
                    ].map((b) => (
                        <div
                            key={b.label}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '5px',
                                color: 'rgba(255,255,255,0.18)',
                                fontSize: '11px',
                                fontWeight: 500,
                            }}
                        >
                            <span style={{ fontSize: '12px' }}>{b.icon}</span>
                            {b.label}
                        </div>
                    ))}
                </div>

                {/* Copyright */}
                <p
                    style={{
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.1)',
                        fontSize: '11px',
                        marginTop: '14px',
                    }}
                >
                    © {new Date().getFullYear()}{' '}
                    <span style={{ fontWeight: 600 }}>{APP_NAME}</span>
                </p>
            </div>
        </div>
    )
}

export default Side
