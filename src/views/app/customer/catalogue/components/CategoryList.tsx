import classNames from 'classnames'
import GridItem from './GridItem'
import { CategoryProduct } from '@/@types/category';

const ProductCategoryListContent = ({ categories }: { categories: CategoryProduct[] }) => {

    return (
      <div className={classNames("mt-6 h-full flex flex-col")}>
        <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {categories.map((category) => (
            <GridItem key={category._id} data={category} />
          ))}
        </div>
      </div>
    );
}

export default ProductCategoryListContent
