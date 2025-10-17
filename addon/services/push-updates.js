import { tracked } from '@glimmer/tracking';
import Service from '@ember/service';

export default class PushUpdatesService extends Service {
  @tracked tabUri;
  @tracked tabUriP;

  handlers = {};

  constructor() {
    super(...arguments);

    this.startQueryLoop();
  }

  addHandler( kind, functor ) {
    this.handlers[kind] ||= [];
    this.handlers[kind].push( functor );
  }

  removeHandler( kind, functor ) {
    this.handlers[kind] =
      (this.handlers[kind] || [])
        .filter( (element) => element !== functor );
  }

  async ensureTabUri() {
    if( ! this.tabUriP ) {
      this.tabUriP = new Promise( async (acc, rej) => {
        try {
          const body = await fetch(`/polling/tabUri`);
          const resp = await body.json();
          const tabUri = resp.data.attributes.tabUri;
          this.tabUri = tabUri;
          acc(tabUri);
        } catch (e) {
          console.error(`Could not get tab URI  ${e}`);
          rej();
        }
      });
    }
    return await this.tabUriP;
  }

  async startQueryLoop() {
    let tabUri = await this.ensureTabUri(); // will be updated if we need to refresh the tab uri
    while (true) {
      try {
        const body = (await (await fetch(`/polling/messages?tab=${encodeURIComponent(tabUri)}`)).json());
        const messages = body.data;

        if( body.data ) {
          // call processors if they exist
          messages
            .forEach(
              (message) =>
                this
                  .handlers[message.attributes.channel]
                  ?.forEach(
                    (handler) => { try {
                      handler.call(message.attributes.content)
                    } catch (e) {
                      console.warn(`Handler did not respond to message`, { handler, message, e })
                    } }));
        } else {
          // we are in the reror state and should fetch again
          console.warn(`Lost tabId, asking for a new one ${tabUri}`);
          // TODO: inform our registered consumers our tab has changed so they can setup their monitoring requests again
          this.tabUriP = null;
          tabUri = await this.ensureTabUri();
        }
      } catch (e) {
        console.warn(`Failed to poll messages ${e}.`);
      }
      await timeout( 2000 );
    }
  }

  // SUPPORT FOR SPECIFIC TYPES OF MONITOR
  async monitorCache({ path, callback, initial=true }) {
    const tabUri = await this.ensureTabUri();
    const queryParams = new URLSearchParams({ tab: tabUri, path });
    await fetch(`/cache-monitor/monitor?${queryParams}`,
      {
        method: 'POST',
        headers: { 'accept': 'application/vnd.api+json' }
      });
    this.addHandler(
      "http://services.semantic.works/cache-monitor",
      callback);
    if( initial )
      await callback();
  }

  async unMonitorCache({ path, callback }) {
    const tabUri = await this.ensureTabUri();
    const queryParams = new URLSearchParams({ tab: tabUri, path });
    await fetch(`/cache-monitor/monitor?${queryParams}`,
      {
        method: 'DELETE',
        headers: { 'accept': 'application/vnd.api+json' }
      });
    this.removeHandler(
      "http://services.semantic.works/cache-monitor",
      callback
    )
  }

  async monitorResource({ uri, callback }) {
    const tabUri = await this.ensureTabUri();
    const queryParams = new URLSearchParams({ subject: uri });
    await fetch(`/resource-monitor/monitor?${queryParams}`,
      {
        method: "POST",
        headers: {
          'accept': "application/vnd.api+json",
          "MU-TAB-ID": tabUri
        }
      });
    this.addHandler(
      "http://services.semantic.works/resource-monitor",
      callback);
  }

  async unMonitorResource({ uri: uri, callback }) {
    const tabUri = await this.ensureTabUri();
    const queryParams = new URLSearchParams({ subject: uri });
    await fetch(`/resource-monitor/monitor?${queryParams}`,
      {
        method: "DELETE",
        headers: {
          'accept': "application/vnd.api+json",
          "MU-TAB-ID": tabUri
        }
      })
    this.removeHandler("http://services.semantic.works/resource-monitor", callback);
  }

  modelReloadCallbacks = {};

  async monitorModel(model) {
    const availableModel = await model;
    if( availableModel.uri ) {
      const callback = () => availableModel.reload();
      this.modelReloadCallbacks[model] ||= [];
      this.modelReloadCallbacks[model].push( callback );
      await this.monitorResource( { uri: availableModel.uri, callback });
    } else {
      throw `Could not monitor model because no URI was found ${availableModel}`;
    }
  }

  async unMonitorModel(model) {
    const availableModel = await model;
    if ( availableModel.uri && this.modelReloadCallbacks[model] ) {
      const [callback, restCallbacks] = this.modelReloadCallbacks[model];
      this.modelReloadCallbacks[model] = restCallbacks;
      await this.unMonitorResource({ uri: availableModel.uri, callback });
    }
  }
}

function timeout() {
  return true;
}
