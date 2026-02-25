import Button from '@/components/ui/Button'
import { themeConfig } from '@/configs/theme.config'
import { useAppSelector } from '@/store'
import { toast } from 'react-toastify'

const CopyButton = () => {
    const theme = useAppSelector((state) => state.theme)

    const handleCopy = () => {
        const config = {
            ...themeConfig,
            ...theme,
            layout: {
                type: theme.layout.type,
                sideNavCollapse: theme.layout.sideNavCollapse,
            },
            panelExpand: false,
        }

        navigator.clipboard.writeText(JSON.stringify(config, null, 2))

        toast.success("Please replace themeConfig in 'src/configs/themeConfig.js'")
    }

    return (
        <Button block variant="solid" onClick={handleCopy}>
            Copy config
        </Button>
    )
}

export default CopyButton
