import logo from './logo.svg';
import './App.css';
import { AWSWAFCaptchaModal } from './aws-waf-captcha/AWSWafCaptcahModal';
import { Login } from './Login';

function App() {
  return (
    <div className="App">
      <div>Web Site</div>
      <Login />
      <AWSWAFCaptchaModal />
    </div>
  );
}

export default App;
