import DockerStreamOutput from "../types/dockerStreamOutput";
import { DOCKER_STREAM_HEADER_SIZE } from "../utils/constants";

function decodeDockerStream(buffer: Buffer): DockerStreamOutput {
    let offset = 0;
    const output: DockerStreamOutput = { stdout: '', stderr: '' };
    
    while (offset < buffer.length) {
        // Channel is read from the first byte of the buffer (type of stream: stdout/stderr)
        const typeOfStream = buffer[offset];
        
        // The length is stored in the next 4 bytes after the typeOfStream (offset + 1 to offset + 5)
        const length = buffer.readUInt32BE(offset + 4);

        // Move forward by the header size (8 bytes)
        offset += DOCKER_STREAM_HEADER_SIZE;

        if (typeOfStream === 1) {
            // stdout
            output.stdout += buffer.toString('utf-8', offset, offset + length);
        } else if (typeOfStream === 2) {
            // stderr
            output.stderr += buffer.toString('utf-8', offset, offset + length);
        }

        // Move the offset by the length of the payload to the next chunk
        offset += length;
    }

    return output;
}

export default function fetchDecodedStream(loggerStream: NodeJS.ReadableStream, rawLogBuffer: Buffer[]): Promise<string> {
    return new Promise((res, rej) => {

        const timeout = setTimeout(() => {
            console.log("Timeout called");
            rej("TLE");
        }, 2000); 

        loggerStream.on('end', () => {
            clearTimeout(timeout);
            console.log(rawLogBuffer);
            // Let's concat all the chunks all together
            const completeBuffer = Buffer.concat(rawLogBuffer);
        
            const decodedStream = decodeDockerStream(completeBuffer);
            console.log(decodedStream);

            if(decodedStream.stderr) {
                rej(decodedStream.stderr);
            } else {
                res(decodedStream.stdout);
            }
        });
    })
}