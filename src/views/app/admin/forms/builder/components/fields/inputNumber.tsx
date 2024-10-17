import { Input } from '@/components/ui'
    
function InputNumberSection({className, label, placeholder, min, max}: {className: string, label: string, placeholder: string, min: number, max: number}) {
  return (
    <div className={className}>
    <p className="text-sm text-gray-400 mb-2">{label}</p>    
    <Input type="number" placeholder={placeholder} min={min} max={max} />
</div>
  );
}
  
export default InputNumberSection
