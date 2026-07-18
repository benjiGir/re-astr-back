import 'dotenv/config'
import { NodeRuntime } from '@effect/platform-node'
import { Layer } from 'effect'
import { MainLive } from '@/App.js'

NodeRuntime.runMain(Layer.launch(MainLive))
