import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
// i18n phải được nạp TRƯỚC App: component đầu tiên gọi useTranslation() cần
// instance đã init sẵn, nếu không lần render đầu sẽ hiện khoá thay vì bản dịch.
import './i18n';
import './index.css';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Không tìm thấy phần tử #root trong index.html');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
