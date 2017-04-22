import React from 'react';
import { render } from 'react-dom';
import App from './components/App.jsx';

render(<App />, document.getElementById('root'));

if (module.hot) {
  module.hot.accept('./components/App.jsx', () => {
    render(App, document.getElementById('root'))
  });
}