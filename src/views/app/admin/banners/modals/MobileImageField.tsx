// Champ « Image téléphone » des modales de bannière (création / édition).
import FileUplaodCustom from '@/components/shared/Upload';
import { UploadImage } from '@/@types/pegFile';
import { MOBILE_BANNER_FORMAT } from '@/utils/bannerVisual';

const MobileImageField = ({
  image,
  setImage,
  labelStyle,
}: {
  image?: UploadImage;
  setImage: (image: UploadImage | undefined) => void;
  labelStyle: React.CSSProperties;
}) => (
  <div>
    <span style={labelStyle}>Image téléphone (facultative)</span>
    <FileUplaodCustom image={image} setImage={setImage} />
    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', lineHeight: 1.5, margin: '6px 0 0' }}>
      Affichée sur téléphone à la place de l'image principale. Format conseillé :{' '}
      <strong style={{ color: 'rgba(255,255,255,0.7)' }}>{MOBILE_BANNER_FORMAT}</strong>.
      Sans elle, le téléphone affiche l'image principale en entier.
    </p>
  </div>
);

export default MobileImageField;
