import React from 'react';
import {AppRegistry, StyleSheet, Text, View, DeviceEventEmitter, NativeModules } from 'react-native';
import SearchUI from 'browser-core/build/modules/mobile-cards/SearchUI';
import SearchUIVertical from 'browser-core/build/modules/mobile-cards-vertical/SearchUI';
import App from 'browser-core/build/modules/core/app';
import { Provider as CliqzProvider } from 'browser-core/build/modules/mobile-cards/cliqz';
import { Provider as ThemeProvider } from 'browser-core/build/modules/mobile-cards-vertical/withTheme';

const Bridge = NativeModules.Bridge;

class Cliqz {
  constructor(app, actions) {
    this.app = app;
    this.app.modules['ui'] = {
      action(action, ...args) {
        return Promise.resolve().then(() => {
          return actions[action](...args);
        });
      },
    };
    this.mobileCards = app.modules['mobile-cards'].background.actions;
    this.geolocation = app.modules['geolocation'].background.actions;
    this.search = app.modules['search'].background.actions;
    this.core = app.modules['core'].background.actions;
  }
}

class BrowserCoreApp extends React.Component {
  state = {
    results: [],
    cliqz: null,
    config: {
      theme: 'light',
    },
  }

  actions = {
    changeTheme: theme => {
      this.setState(prevState => ({
        config: {
          ...prevState.config,
          theme
        }
      }));
    }
  }

  onAction = ({ module, action, args, id }) => {
    return this.loadingPromise.then(() => {
      return this.state.cliqz.app.modules[module].action(action, ...args).then((response) => {
        if (typeof id !== 'undefined') {
          NativeModules.Bridge.replyToAction(id, response);
        }
        return response;
      });
    }).catch(e => console.error(e));
  }

  async componentWillMount() {
    const app = new App();
    let cliqz;
    const config = await Bridge.getConfig();
    this.setState({ config });
    this.loadingPromise = app.start().then(async () => {
      await app.ready();
      cliqz = new Cliqz(app, this.actions);
      this.setState({
        cliqz,
      });
      app.events.sub('search:results', (results) => {
        this.setState({ results })
      });
    });
    DeviceEventEmitter.addListener('action', this.onAction);
  }

  render() {
    const results = this.state.results.results || [];
    const meta = this.state.results.meta || {};
    return (
      <View style={styles.container}>
        {
          (results.length === 0) || !this.state.cliqz
          ? null
          : (
            <CliqzProvider value={this.state.cliqz}>
              <ThemeProvider value={this.state.config.theme}>
                <SearchUIVertical results={results} meta={meta} />
              </ThemeProvider>
            </CliqzProvider>
          )
        }
      </View>
    );
  }
}
var styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  }
});

AppRegistry.registerComponent('BrowserCoreApp', () => BrowserCoreApp);
