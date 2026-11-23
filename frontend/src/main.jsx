import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { StoreProviders } from './context/StoreContexts.jsx';
import App from './App.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<BrowserRouter><StoreProviders><App /></StoreProviders></BrowserRouter>);
