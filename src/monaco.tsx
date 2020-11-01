/// MEGA HACKS

import React, {
  useRef,
  useState,
  RefObject,
  useEffect,
  FC,
  KeyboardEventHandler,
  useMemo,
} from 'react';
import type TMonaco from 'monaco-editor';

import * as Y from 'yjs';

// @ts-expect-error
import { MonacoBinding } from 'y-monaco';
import { WebrtcProvider } from 'y-webrtc';

const baseUrl =
  'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.21.2/min';

const monacoPromised = (async () => {
  // don't show typescript how hacky I am
  const wat = window as any;

  if (!wat.require) {
    const scr = document.createElement('script');
    scr.setAttribute('src', `${baseUrl}/vs/loader.min.js`);
    const load = new Promise((res) => scr.addEventListener('load', res));
    document.head.append(scr);

    await load;
    console.log('loaded require');
  }

  if (!wat.monaco) {
    wat.require.config({ paths: { vs: `${baseUrl}/vs` } });

    wat.MonacoEnvironment = { getWorkerUrl: () => proxy };
    let proxy = URL.createObjectURL(
      new Blob(
        [
          `
        self.MonacoEnvironment = {
            baseUrl: '${baseUrl}'
        };
        importScripts('${baseUrl}/vs/base/worker/workerMain.min.js');
    `,
        ],
        { type: 'text/javascript' },
      ),
    );

    await new Promise((res) => wat.require(['vs/editor/editor.main'], res));

    console.log('loaded monaco');
  }

  return wat.monaco;
})();

/** last step in a series of hacks */
export const useMonaco = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<TMonaco.editor.IStandaloneCodeEditor>();
  const [mon, setMon] = useState<typeof TMonaco.editor>();

  useEffect(() => {
    monacoPromised.then((mon) => {
      const ed = mon.editor.create(ref.current, {
        value: '',
        wordWrap: 'on',
      });

      mon.editor.setTheme('vs-dark');

      setMon(mon);
      setEditor(ed);
    });
  }, []);

  useEffect(() => {
    if (editor) {
      const resize = () => {
        editor.layout();
      };
      window.addEventListener('resize', resize);

      return () => {
        window.removeEventListener('resize', resize);
      };
    }
  }, [editor]);

  return [ref, editor, mon] as [
    RefObject<HTMLDivElement>,
    TMonaco.editor.IStandaloneCodeEditor?,
    typeof TMonaco?,
  ];
};

import style from './monaco.module.css';

export const Editor: FC<{
  name?: string;
  value: string;
  onChange: (s: string) => void;
}> = ({ value, name, onChange }) => {
  const [ref, editor, mon] = useMonaco();

  const [changed, setChanged] = useState(false);

  /*
  const [doc, setDoc] = useState(() => new Y.Doc());

  doc.getText('monaco');

  // clean up with hook?
  const [provider, setProvider] = useState<WebrtcProvider>();

  useEffect(() => {
    const [name, password] = room.split('~');

    // @ts-expect-error
    const provider = new WebrtcProvider(name, doc, { password });

    console.log('A PROVIDER', provider);
    setProvider(provider);

    return () => {
      setProvider(undefined);
      console.log('DISCONNECT_PROVIDER');

      provider.disconnect();
    };
    // return provider;
  }, [doc, room]);

  // not quite right with reconnect errors
  // const provider = useMemo(() => {
  //   const [name, password] = room.split('~');

  //   console.log('WAT', doc, room);

  //   // @ts-expect-error
  //   const provider = new WebrtcProvider(name, doc, { password });

  //   return provider;
  // }, [doc, room]);

  // console.log('Monss', room);
  */

  useEffect(() => {
    if (editor && mon && name) {
      const model = mon.editor.createModel(
        value,
        undefined,
        mon.Uri.file(name),
      );

      editor.setModel(model);

      model.onDidChangeContent((e) => {
        setChanged(true);
      });

      return () => {
        model.dispose();
      };
    }
  }, [editor, value]);

  const down: KeyboardEventHandler = (e) => {
    if (
      (window.navigator.platform.match('Mac') ? e.metaKey : e.ctrlKey) &&
      e.key == 's'
    ) {
      e.preventDefault();

      const v = editor?.getValue();
      if (v) {
        onChange(v);
        setChanged(false);
      }
    }
  };

  return (
    <div className={style.container} onKeyDown={down}>
      <header className={style.header}>
        <span>
          {name} {changed && '*'}
        </span>
        <a href="#" className={style.share}>
          ↗︎
        </a>
      </header>
      <div className={style.main} ref={ref} />
    </div>
  );
};