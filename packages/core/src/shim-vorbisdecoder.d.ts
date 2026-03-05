/* eslint-disable ts/no-redeclare */
/* eslint-disable no-var */
/* eslint-disable vars-on-top */

interface VorbisDecoder {
  destroy: () => void
  send: (arrayBuffer: ArrayBufferLike, loaded: boolean) => void
}

interface VorbisDecoderConstructor {
  new(
    context: AudioContext | null,
    onDecode: (buffer: AudioBuffer) => void,
    onError: (buffer: unknown) => void
  ): VorbisDecoder
}

declare var VorbisDecoder: VorbisDecoderConstructor
