import React, { useState } from 'react';
import { Form } from '../../constants/type';
import { Input, DatePicker, Button } from '@/components/ui';

interface FieldConfigProps {
  selectedField: Form | null;
  onConfigChange: (config: Partial<Form>) => void;
  handleAddField: (field: Form) => void;
}

const FieldConfig: React.FC<FieldConfigProps> = ({ selectedField, onConfigChange, handleAddField }) => {
  const [newOption, setNewOption] = useState('');

  if (!selectedField) return null;

  const handleAddOption = () => {
    if (newOption && selectedField.options) {
      onConfigChange({ options: [...selectedField.options, newOption] });
      setNewOption('');
    }
  };

  const handleSaveField = () => {
    handleAddField(selectedField);
  };

  const renderOptions = () => (
    <div>
      <h4 className="font-semibold mb-2">Options</h4>
      {selectedField.options && selectedField.options.map((option, index) => (
        <div key={index} className="flex items-center mb-2">
          <Input value={option} readOnly />
          <Button
            onClick={() => onConfigChange({
              options: selectedField.options?.filter((_, i) => i !== index)
            })}
            className="ml-2"
          >
            Supprimer
          </Button>
        </div>
      ))}
      <div className="flex items-center">
        <Input
          value={newOption}
          onChange={(e) => setNewOption(e.target.value)}
          placeholder="Nouvelle option"
        />
        <Button onClick={handleAddOption} className="ml-2">Ajouter</Button>
      </div>
    </div>
  );
  return (
    <div className="rounded-md">
       <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold mb-4">Configuration du champ</h3>
        <Button
          variant="solid"
          size="md"
          onClick={() => handleAddField(selectedField)}
        >
          Enregistrer
        </Button>
      </div>
      <div className="space-y-4">
        <Input
          placeholder="Titre"
          value={selectedField.label}
          onChange={(e) => onConfigChange({ label: e.target.value })}
        />
        <Input
          placeholder="Placeholder"
          value={selectedField.placeholder}
          onChange={(e) => onConfigChange({ placeholder: e.target.value })}
        />
        
        {/* Configuration spécifique pour chaque type de champ */}
        {selectedField.type === 'input' && (
          <Input
            placeholder="ex: text, email, password"
            onChange={(e) => onConfigChange({ inputType: e.target.value })}
          />
        )}
        
        {selectedField.type === 'textarea' && (
          <Input
            placeholder="Nombre de lignes"
            min={1}
            onChange={(e) => onConfigChange({ rows: parseInt(e.target.value) })}
          />
        )}
        
        {(selectedField.type === 'select' || selectedField.type === 'checkbox' || selectedField.type === 'radio') && renderOptions()}
        
        {selectedField.type === 'date' && (
          <DatePicker
            placeholder="Date par défaut"
            onChange={(date: Date | null) => onConfigChange({ defaultDate: date })}
          />
        )}
        
        {selectedField.type === 'file' && (
          <Input
            placeholder="Types de fichiers acceptés"
            onChange={(e) => onConfigChange({ acceptedFileTypes: e.target.value })}
          />
        )}
        
        {/*selectedField.type === 'number' && (
          <>
            <Input
              placeholder="Valeur minimale"
              onChange={(e) => onConfigChange({ min: parseInt(e.target.value) })}
            />
            <Input
              placeholder="Valeur maximale"
              onChange={(e) => onConfigChange({ max: parseInt(e.target.value) })}
            />
          </>
        )*/}
        
        {selectedField.type === 'color' && (
          <Input
            placeholder="Couleur par défaut"
            onChange={(e) => onConfigChange({ defaultColor: e.target.value })}
          />
        )}
      </div>
    </div>
  );
};

export default FieldConfig;
