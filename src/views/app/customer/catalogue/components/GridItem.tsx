import Card from '@/components/ui/Card';
import { useNavigate } from 'react-router-dom';
import { ProductCategory } from '@/@types/product';

const GridItem = ({ data }: { data: ProductCategory }) => {
  const { name, image } = data;
  const navigate = useNavigate();
  return (
    <Card
      bodyClass=" bg-gray-900 rounded-lg project-card justify-center items-center"
      onClick={() => navigate(`/customer/catalogue/categories/${data.documentId}`)}
    >
      <div className="flex flex-col justify-center items-center">
        <a className="cursor-pointer">
          <h6 className="flex flex-col justify-center flex-grow items-center gap-2">
            <img
              src={image?.url}
              alt={name}
              className="w-30 h-30 rounded-full"
            />
            {name}
          </h6>
        </a>
      </div>
    </Card>
  );
};

export default GridItem;
