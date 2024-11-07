import Card from '@/components/ui/Card';
import { CategoryProduct } from '@/@types/category';
import { API_URL_IMAGE } from '@/configs/api.config';
import { Button } from '@/components/ui';
import { useNavigate } from 'react-router-dom';

const GridItem = ({
  data,
  handleDeleteProject,
}: {
  data: CategoryProduct;
  handleDeleteProject: (id: string) => void;
}) => {
  const { title, image, totalProducts } = data;

  const navigate = useNavigate();

  return (
    <Card
      bodyClass=" bg-gray-900 rounded-lg project-card justify-center items-center"
      onClick={() => navigate(`/admin/store/categories/${data._id}`)}
    >
      <div className="flex flex-col justify-center items-center">
        <a className="cursor-pointer">
          <h6 className="flex flex-col justify-center flex-grow items-center gap-2">
            <img
              src={API_URL_IMAGE + image}
              alt={title}
              className="w-30 h-30 rounded-full"
            />
            {title}
          </h6>
        </a>
        <div className="flex items-center justify-center  mt-2">
          <div className="flex items-center rounded-full font-semibold text-xs">
            <div
              className={`flex items-center px-2 py-1 border-2 border-gray-300 rounded-full`}
            >
              <span className="ml-1 rtl:mr-1 whitespace-nowrapn text-white">
                {totalProducts} produits
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-4">
        <Button variant="twoTone" onClick={() => handleDeleteProject(data._id)}>
          Supprimer
        </Button>
      </div>
    </Card>
  );
};

export default GridItem;
