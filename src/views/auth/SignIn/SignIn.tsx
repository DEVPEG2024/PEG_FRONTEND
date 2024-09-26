import { useTranslation } from 'react-i18next'
import SignInForm from './SignInForm'

const SignIn = () => {
    const {t} = useTranslation()
    return (
        <>
            <div className="mb-8">
                <h3 className="mb-1">{t("welcome_to_product_management")}</h3>
                <p>{t("please_enter_your_credentials_to_login")}</p>
            </div>
            <SignInForm disableSubmit={false} />
        </>
    )
}

export default SignIn
