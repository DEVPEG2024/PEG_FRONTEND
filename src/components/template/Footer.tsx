import classNames from 'classnames'
import Container from '@/components/shared/Container'
import { APP_NAME } from '@/constants/app.constant'
import { PAGE_CONTAINER_GUTTER_X } from '@/constants/theme.constant'

export type FooterPageContainerType = 'gutterless' | 'contained'

type FooterProps = {
    pageContainerType: FooterPageContainerType
}

// Téléphone (max-md) : une seule ligne centrée, petite et estompée —
// « © 2026 MyPEG · Term & Conditions · Privacy & Policy ». Bureau inchangé.
const FooterContent = () => {
    return (
        <div className="flex items-center justify-between flex-auto w-full max-md:justify-center max-md:gap-1.5 max-md:text-[11px] max-md:leading-none max-md:whitespace-nowrap max-md:opacity-60">
            <span className="max-md:shrink-0">
                <span className="max-md:hidden">Copyright </span>&copy;{' '}
                {`${new Date().getFullYear()}`}{' '}
                <span className="font-semibold max-md:font-medium">{`${APP_NAME}`}</span>
                <span className="max-md:hidden"> All rights reserved.</span>
            </span>
            <span className="hidden max-md:inline" aria-hidden="true">
                ·
            </span>
            <div className="max-md:flex max-md:items-center max-md:gap-1.5 max-md:min-w-0">
                <a
                    className="text-gray"
                    href="/#"
                    onClick={(e) => e.preventDefault()}
                >
                    Term & Conditions
                </a>
                <span className="mx-2 text-muted max-md:mx-0" aria-hidden="true">
                    <span className="max-md:hidden"> | </span>
                    <span className="hidden max-md:inline">·</span>
                </span>
                <a
                    className="text-gray"
                    href="/#"
                    onClick={(e) => e.preventDefault()}
                >
                    Privacy & Policy
                </a>
            </div>
        </div>
    )
}

export default function Footer({
    pageContainerType = 'contained',
}: FooterProps) {
    return (
        <footer
            className={classNames(
                `footer flex flex-auto items-center h-16 max-md:h-10 ${PAGE_CONTAINER_GUTTER_X}`
            )}
        >
            {pageContainerType === 'contained' ? (
                <Container>
                    <FooterContent />
                </Container>
            ) : (
                <FooterContent />
            )}
        </footer>
    )
}
