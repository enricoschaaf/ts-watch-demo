import { pathToFileURL, fileURLToPath } from "url"
import { transform } from "esbuild"
import { existsSync } from "fs"

const baseUrl = pathToFileURL(`${process.cwd()}/`).href

const excludeRegex = /^\w+:/

/**
 * @param {string} specifier
 * @param {{
 *  conditions: !Array<string>,
 *  parentURL: !(string | undefined),
 * }} context
 * @param {Function} defaultResolve
 * @returns {Promise<{ url: string }>}
 */
export async function resolve(specifier, context, defaultResolve) {
  const { parentURL = baseUrl } = context

  if (specifier.endsWith(".ts")) {
    return { url: new URL(specifier, parentURL).href, format: "module" }
  }

  if (!excludeRegex.test(specifier)) {
    const tests = [
      [`${specifier}.ts`, parentURL],
      [`${specifier}.ts`, baseUrl],
      [`${specifier}/index.ts`, parentURL],
    ]

    for (const [file, base] of tests) {
      const url = new URL(file, base).href

      if (existsSync(fileURLToPath(url))) {
        return {
          url,
          format: "module",
        }
      }
    }
  }

  const { url, format } = defaultResolve(specifier, context, defaultResolve)

  return { url, format: url.endsWith(".ts") ? "module" : format }
}

/**
 * @param {string} url
 * @param {{
 *   format: string,
 * }}
 * @param {Function} defaultLoad
 * @returns {Promise<{
 *  format: !string,
 *  source: !(string | ArrayBuffer | SharedArrayBuffer | Uint8Array),
 * }>}
 */
export async function load(url, context, defaultLoad) {
  try {
    process.send(fileURLToPath(url))
  } catch {}

  const { format } = context

  if (url.endsWith(".ts")) {
    const { source } = await defaultLoad(url, { format })

    const { code, warnings } = await transform(source.toString(), {
      sourcefile: fileURLToPath(url),
      sourcemap: "both",
      loader: "ts",
      target: "esnext",
      format: format === "module" ? "esm" : "cjs",
    })

    warnings?.forEach(({ location, text }) => {
      console.log(location)
      console.log(text)
    })

    return {
      source: code,
      format,
    }
  }

  return defaultLoad(url, context, defaultLoad)
}
