import { dirname } from "path"
import { fork } from "child_process"
import { fileURLToPath } from "url"
import { watch } from "chokidar"

const args = process.argv.slice(2, process.argv.length)
const shouldWatch = args.find((arg) => ["-w", "--watch"].includes(arg))
const [file] = args.filter((arg) => !["-w", "--watch"].includes(arg))

const red = (text) => `\x1b[31m${text}\x1b[0m`

if (!file) {
  console.error(red("No path specified"))
  process.exit(1)
}

const childProcessParams = [
  file,
  process.argv.slice(3, process.argv.length),
  {
    env: {
      NODE_OPTIONS: `--no-warnings --enable-source-maps --loader ${dirname(
        fileURLToPath(import.meta.url),
      )}/typescriptLoader --experimental-specifier-resolution=node`,
      ...process.env,
    },
  },
]

let childProcess = fork(...childProcessParams)

if (shouldWatch) {
  const watcher = watch()

  watcher.on("change", () => {
    childProcess.kill()
    watcher.unwatch()
    childProcess = fork(...childProcessParams)
  })

  childProcess.on("message", (path) => watcher.add(path))
}
