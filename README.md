# ember-polling-push-updates

The ember-polling-push-updates Ember addon offers push/real-time updates via long-polling for a semantic.works stack. It registers a browser tab with a backend server, then continuously polls for messages. When messages arrive, it dispatches them to registered handlers allowing the UI t react to server-side changes without a full page reload.

The addon integrates with 2 backend services:
- **[push-update-resource-monitor-service](https://github.com/redpencilio/push-update-resource-monitor-service)**: Monitors RDF triple patterns clients have subscribed to and generates push updates for them
- **[push-update-cache-monitor-service](https://github.com/redpencilio/push-update-cache-monitor-service)**: Monitors cache clear events and generates push updates for them

## Getting started

```bash
ember install ember-polling-push-updates
```

## Reference
### Decorators
#### @monitorCache(cachePath)
A class decorator for Ember routes. Takes a `cachePath` (mu-cache path string) as argument.

- On **activate**: registers a cache monitor for that path; calls the callback on cache clear (not on initial activation)
- On **deactivate**: unregisters the monitor
- **Callback**: calls `router.refresh()` to reload the route

Example

``` javascript
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import monitorCache from 'ember-polling-push-updates/decorators/monitor-cache'

@monitorCache('/messages?sort=-sent-at')
export default class ChatRoute extends Route {
  @service store;

  async model() {
    return await this.store.query('message', { sort: "-sent-at" })
  }
}
```

#### @monitorModelUri
A class decorator for Ember routes. Requires no arguments.

- On **activate**: registers a monitor for the route's model by its `uri` attribute
- On **deactivate**: unregisters the monitor
- **Callback**: calls `model.reload()` to reload the model

Example

``` javascript
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import monitorModelUri from 'ember-polling-push-updates/decorators/monitor-model-uri';

@monitorModelUri
export default class TasksShowRoute extends Route {
  @service store;

  async model({task_id}) {
    return this.store.findRecord('task', task_id);
  }
}
```

### push-updates service
Instead of using the predefined decorators, you can also use the `pushUpdates` service to register a monitor.

The push-updates service offers methods to (un)monitor cache invalidations by their path, RDF resources by their URI and Ember data models.

#### Monitor cache invalidations

`monitorCache({ path, callback, initial? })`: Register a callback for a mu-cache path. If `initial: true` (default), fires the callback immediately.

`unMonitorCache({ path, callback })`: Unregister a cache monitor.

#### Monitor RDF resource

`monitorResource({ uri, callback })`: Register a callback for a specific RDF resource URI.

`unMonitorResource({ uri, callback })`: Unregister a resource monitor.

#### Monitor Ember data model

`monitorModel(model)`: Monitors a model by its `uri` attribute, calls `model.reload()` on change.

`unMonitorModel(model)`: Unregisters a model monitor.
