import { injectReducer } from '@/store'
import { useEffect, useState } from "react";
import reducer, {
  clearState,
  setFormDialog,
  useAppDispatch,
  useAppSelector,
} from "./store";
import Loading from '@/components/shared/Loading';
import Container from '@/components/shared/Container';
import Input from "@/components/ui/Input";
import { Button } from '@/components/ui';
import ModalShowForm from './modal/ModalShowForm';

injectReducer("showOrder", reducer);

const ShowOrder = () => {
  const dispatch = useAppDispatch()
  const { product, sizesSelected } = useAppSelector((state) => state.showOrder.data)
  const [isFirstRender, setFirstRender] = useState<boolean>(true);

  useEffect(() => {
    if (isFirstRender) {
      setFirstRender(false)
    }
    return () => {
      if (!isFirstRender) {
        dispatch(clearState())
      }
    }
  }, [isFirstRender])

  const handleShowForm = () => {
    dispatch(setFormDialog(true));
  }

  return product && (
    <Container className="h-full">
      <Loading>
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row items-center justify-between">
            <div className="lg:w-1/2 w-full">
              <img
                src={product.images[0]?.fileNameBack}
                alt={product.title}
                className="w-full h-auto rounded-lg shadow-md object-cover"
              />
            </div>

            <div className="lg:w-1/2 w-full lg:pl-12 mt-6 lg:mt-0">
              <div className="flex flex-col justify-between">
                <h1 className="text-3xl font-bold">{product.title}</h1>
                <p className="text-2xl font-semibold">{product.amount.toFixed(2)} €</p>
              </div>

              <p className="mt-4 leading-relaxed">{product.description.replace('<p>', '').replace('</p>', '')}</p>

              {product.sizes.status && (
                <div>
                  <p className="font-bold text-yellow-500 mb-4">Choix des tailles</p>
                  <div className="grid grid-cols-7 gap-4 mb-6">
                    {product.sizes.options.map((option) => (
                      <div key={option.value} className="grid gap-4">
                        <span>{option.label}</span>
                        <Input
                          name={option.value}
                          value={sizesSelected.find((sizeSelected) => sizeSelected.value === option.value)?.quantity}
                          type="number"
                          autoComplete="off"
                          disabled={true}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {product.form && (
                <Button
                  className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  onClick={() => handleShowForm()}
                >
                  {'Voir les détails du produit'}
                </Button>
              )}

            </div>
          </div>
        </div>
      </Loading>
      {product.form && <ModalShowForm form={product.form} />}
    </Container>
  );
}

export default ShowOrder
