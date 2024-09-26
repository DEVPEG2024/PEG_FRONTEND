export const generateEAN13 = (): string => {
    // Générer les 12 premiers chiffres aléatoirement
    let ean = '';
    for (let i = 0; i < 12; i++) {
      ean += Math.floor(Math.random() * 10).toString();
    }
  
    // Calculer le chiffre de contrôle
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(ean[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
  
    // Ajouter le chiffre de contrôle au code-barres
    ean += checkDigit.toString();
  
    return ean;
  };
