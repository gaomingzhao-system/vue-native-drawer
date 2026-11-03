import { createVaporApp } from 'vue'
import App from './App.vue'
import './style.css'

// The playground runs on the library sources, which bring their own styles. An app using the
// published package also imports 'vue-native-drawer/style.css'.
createVaporApp(App).mount('#app')
