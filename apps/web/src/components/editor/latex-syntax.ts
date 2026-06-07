import { StreamLanguage } from '@codemirror/language';

export const latexLanguage = StreamLanguage.define<{ inMath: boolean }>({
  startState: () => ({ inMath: false }),
  token(stream, state) {
    if (stream.eatSpace()) return null;

    if (stream.match('%')) {
      stream.skipToEnd();
      return 'comment';
    }

    if (stream.match('$$') || stream.match('$')) {
      state.inMath = !state.inMath;
      return 'keyword';
    }

    if (stream.match(/\\[a-zA-Z]+/)) {
      return 'keyword';
    }

    if (stream.match('{') || stream.match('}')) {
      return 'bracket';
    }

    if (stream.match('[') || stream.match(']')) {
      return 'bracket';
    }

    stream.next();
    return null;
  },
});
