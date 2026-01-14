import {
  sparqlEscapeUri,
  uuid,
  sparqlEscapeString,
  sparqlEscapeDateTime,
  sparqlEscapeInt,
} from 'mu';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { writeFile, stat } from 'fs/promises';
import { updateSudo as update } from '@lblod/mu-auth-sudo';
import {
  MU_SPARQL_ENDPOINT,
  OPARL_TO_ELI_SERVICE_URI,
  PREFIXES_SPARQL,
} from '../constants';
const connectionOptions = {
  sparqlEndpoint: MU_SPARQL_ENDPOINT,
  mayRetry: true,
};

/**
 * Write the given TTL content to a file and relates it to the given remote file and submitted document
 *
 * @param string graph Graph to write the content to
 * @param string content Content to write to the file
 * @param string logicalFileName Logical file name
 * @param string sourceFile URI of the source file to relate the new file to
 * @param string folderId Optional folder ID to organize files (defaults to empty string)
 * @param string contentType Content type of the file (defaults to "text/turtle")
 * @param string extension File extension (defaults to "ttl")
 * @param string subfolder Optional subfolder within extract directory (defaults to empty string)
 */
export async function writeFileToTriplestore(
  graph,
  content,
  logicalFileName,
  sourceFile,
  folderId = '',
  contentType = 'text/turtle',
  extension = 'ttl',
  subfolder = '',
) {
  const baseFolder = subfolder
    ? join('/share', folderId, 'extract', subfolder)
    : join('/share', folderId, 'extract');
  await mkdir(baseFolder, { recursive: true });

  const physicalFileId = uuid();
  const physicalFilename = `${physicalFileId}.${extension}`;
  const path = `${baseFolder}/${physicalFilename}`;
  const physicalFile = path.replace('/share/', 'share://');
  const logicalFileId = uuid();
  const logicalFile = `http://data.lblod.info/id/files/${logicalFileId}`;
  const now = new Date();

  try {
    await writeFile(path, content, 'utf-8');
  } catch (e) {
    console.log(`Failed to write TTL to file <${physicalFile}>.`);
    throw e;
  }

  try {
    const stats = await stat(path);
    const fileSize = stats.size;

    // prettier-ignore
    await update(`
        ${PREFIXES_SPARQL}
        INSERT DATA {
          GRAPH ${sparqlEscapeUri(graph)} {
            ${sparqlEscapeUri(physicalFile)} a nfo:FileDataObject;
                                    nie:dataSource ${sparqlEscapeUri(logicalFile)} ;
                                    mu:uuid ${sparqlEscapeString(physicalFileId)};
                                    nfo:fileName ${sparqlEscapeString(physicalFilename)} ;
                                    dct:creator ${sparqlEscapeUri(OPARL_TO_ELI_SERVICE_URI)} ;
                                    dct:created ${sparqlEscapeDateTime(now)};
                                    dct:modified ${sparqlEscapeDateTime(now)};
                                    dct:format "${contentType}";
                                    nfo:fileSize ${sparqlEscapeInt(fileSize)};
                                    dbpedia:fileExtension "${extension}".
            ${sparqlEscapeUri(logicalFile)} a nfo:FileDataObject;
                                    prov:wasDerivedFrom ${sparqlEscapeUri(sourceFile)};
                                    mu:uuid ${sparqlEscapeString(logicalFileId)};
                                    nfo:fileName ${sparqlEscapeString(logicalFileName)} ;
                                    dct:creator ${sparqlEscapeUri(OPARL_TO_ELI_SERVICE_URI)} ;
                                    dct:created ${sparqlEscapeDateTime(now)};
                                    dct:modified ${sparqlEscapeDateTime(now)};
                                    dct:format "${contentType}";
                                    nfo:fileSize ${sparqlEscapeInt(fileSize)};
                                    dbpedia:fileExtension "${extension}" .

            ${sparqlEscapeUri(sourceFile)} nie:url ${sparqlEscapeUri(sourceFile)};
          }
        }
  `, {}, connectionOptions);
  } catch (e) {
    console.log(
      `Failed to write TTL resource <${logicalFile}> to triplestore.`,
    );
    throw e;
  }

  return logicalFile;
}
