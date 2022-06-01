import { writeFile, mkdir, rm } from 'fs/promises'
import path from 'path'
import { Folders } from './types'

export const parseResponse = async <RetType = any, T extends Promise<Response> = Promise<any>>(
  responsePromise: T
): Promise<RetType> => {
  const response = await responsePromise
  const responseJson = await response.json()

  return responseJson
}

export const clearFolders = async () => {
  const debugFolder = path.resolve((path.dirname(require.main!.filename), Folders.DEBUG))
  const listsFolder = path.resolve((path.dirname(require.main!.filename), Folders.LISTS))

  await rm(debugFolder, { recursive: true, force: true })
  await rm(listsFolder, { recursive: true, force: true })
}

export const exportToJSON = async (name: string, data: object, folder: Folders = Folders.DEBUG) => {
  const resolvedFolder = path.resolve((path.dirname(require.main!.filename), folder))
  await mkdir(resolvedFolder, { recursive: true })

  await writeFile(path.resolve(resolvedFolder, `${name}.json`), JSON.stringify(data, undefined, 2))
}
