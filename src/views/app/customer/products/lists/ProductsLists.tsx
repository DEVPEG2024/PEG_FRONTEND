import { injectReducer } from '@/store'
import reducer, {
  getProducts,
  useAppDispatch,
  useAppSelector,
  setProduct,
} from "../store";
import { useEffect } from 'react'
import { Card } from '@/components/ui'
import { isEmpty } from 'lodash'
import { API_URL_IMAGE } from '@/configs/api.config';
import { useNavigate } from 'react-router-dom'

injectReducer("products", reducer);

const ProductsLists = () => {
  const user = useAppSelector(state => state.auth.user)
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const {products} = useAppSelector((state) => state.products.data)
    useEffect(() => {
       dispatch(getProducts({page: 1, pageSize: 10, searchTerm: "", userId: user?._id || "", userCategoryId: user?.category?._id || ""}))
       dispatch(setProduct(null))
    }, [dispatch])

    const handleClick = (id: string) => {
        navigate(`/customer/product/${id}`)
    }

    return (
      <>
        <div className="lg:grid lg:grid-cols-3 items-center justify-between mb-4">
          <h3 className="mb-4 lg:mb-0 col-span-1">Mes offres personnalisées</h3>
        </div>

        {/* {isEmpty(products) && (
          <div className="h-full flex flex-col items-center justify-center">
            <DoubleSidedImage
              src="/img/others/img-2.png"
              darkModeSrc="/img/others/img-2-dark.png"
              alt="Aucune offre personnalisée trouvée"
            />
            <h3 className="mt-8">Aucune offre personnalisée trouvée</h3>
          </div>
        )} */}
        {!isEmpty(products) && (
          <div className="grid grid-cols-2 md:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {products.map((product) => (
              <Card key={product._id} clickable onClick={(e) => handleClick(product._id)}>
                <div className="flex flex-col gap-4">
                  <img
                    src={product.images[0]?.fileNameBack}
                    alt={product.title}
                    className=" rounded-lg bg-yellow-400"
                    style={{
                      height: "250px",
                      width: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <div className="flex flex-col justify-between">
                    <p className="text-lg font-bold">{product.title}</p>
                    <p className="text-lg font-bold text-white">
                      {product.amount}€
                    </p>
                    {product.stock > 0 ? (
                      <p className="text-sm text-emerald-500">En stock</p>
                    ) : (
                      <p className="text-sm text-red-500">Rupture de stock</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </>
    );
}

export default ProductsLists
