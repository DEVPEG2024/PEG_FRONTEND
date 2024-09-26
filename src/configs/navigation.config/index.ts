
import navigationAdmin from './admin';
import navigationProducteur from './produceur';
import navigationCustomer from './customer';

const navigationConfig = [ ...navigationAdmin,...navigationProducteur, ...navigationCustomer];

export default navigationConfig;
