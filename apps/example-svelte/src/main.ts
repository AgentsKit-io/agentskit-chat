import { mount } from 'svelte'
import App from './App.svelte'
import './styles.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root')
mount(App, { target: root })
