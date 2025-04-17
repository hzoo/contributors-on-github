// https://github.com/octo-linker/injection 1.1.0 (2022-07-13)

type GitHubInjectionCallback = () => void;

const gitHubInjection = (cb: GitHubInjectionCallback): void => {
  if (!cb) {
    throw new Error('Missing argument callback');
  }

  if (typeof cb !== 'function') {
    throw new TypeError('Callback is not a function');
  }

  document.addEventListener('pjax:end', cb);
  document.addEventListener('turbo:render', cb);
  cb();
};

// Use ES module export
export default gitHubInjection;
