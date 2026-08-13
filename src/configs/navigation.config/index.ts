import navigationAdmin from './admin';
import navigationProducteur from './produceur';
import navigationCustomer from './customer';
import navigationGenerator from './generator';

const navigationConfig = [ ...navigationAdmin,...navigationProducteur, ...navigationCustomer, ...navigationGenerator];

export default navigationConfig;
