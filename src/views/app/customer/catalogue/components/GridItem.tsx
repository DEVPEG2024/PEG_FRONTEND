import Card from "@/components/ui/Card";
import { CategoryProduct } from "@/@types/category";
import { API_URL_IMAGE } from "@/configs/api.config";
import { useNavigate } from "react-router-dom";

const GridItem = ({ data }: { data: CategoryProduct }) => {
  const {
    title,
    image,
  } = data;
  const navigate = useNavigate()
  return (
    <Card bodyClass=" bg-gray-900 rounded-lg project-card justify-center items-center" onClick={() => navigate(`/catalogue/categories/${data._id}`)}>
        <div className="flex flex-col justify-center items-center">
          <a className="cursor-pointer">
            <h6 className="flex flex-col justify-center flex-grow items-center gap-2">
              <img src={API_URL_IMAGE + image} alt={title} className="w-30 h-30 rounded-full" />  
              {title}
            </h6>
          </a>
        </div>
    </Card>
  );
};

export default GridItem;
