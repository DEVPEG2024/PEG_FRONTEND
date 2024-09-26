import { useTranslation } from "react-i18next"
import { Button } from "../ui";
import { useNavigate } from "react-router-dom";
const HeaderTitle = ({
  title,
  buttonTitle,
  description,
  action,
  addAction,
  total,
  link,
}: {
  title: string;
  buttonTitle: string;
  description: string;
  total: number;
  link: string;
  addAction: boolean;
  action?: () => void;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate()
  return (
    <div>
      <div className="flex justify-between items-center">
        <div>
          <h2>{t(title)} ({total})</h2>
          <p>{t(description)}</p>
        </div>
        {addAction && (
        <Button variant="solid" size="sm" onClick={action ? action : () => {navigate(link)}}>
          {t(buttonTitle)} 
        </Button>
        )}
      </div>
    </div>
  );
};

export default HeaderTitle
