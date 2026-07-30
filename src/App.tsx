import { AppProvider } from './context/AppContext';
import { AudienceView } from './components/audience/AudienceView';
import { OperatorView } from './components/operator/OperatorView';
import { RemoteApp } from './components/remote/RemoteApp';

function App() {
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const isRemote = window.location.pathname.replace(/\/+$/, '') === '/remote' || view === 'remote';

  if (isRemote) {
    // The remote page talks to the local server over Socket.IO and does not
    // need the browser-storage event state, so it stays outside AppProvider.
    return <RemoteApp />;
  }

  const isAudience = view === 'audience';
  const embedded = params.get('embedded') === '1';

  return <AppProvider>{isAudience ? <AudienceView embedded={embedded} /> : <OperatorView />}</AppProvider>;
}

export default App;
