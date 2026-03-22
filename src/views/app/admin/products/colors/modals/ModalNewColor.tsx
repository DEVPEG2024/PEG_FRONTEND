import ModalColor from './ModalColor';

export type { ColorFormModel } from './ModalColor';

function ModalNewColor() {
  return <ModalColor mode="create" />;
}

export default ModalNewColor;
