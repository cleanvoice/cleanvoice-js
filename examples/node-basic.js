const { Cleanvoice } = require('@cleanvoice/cleanvoice-sdk');

async function main() {
  const client = Cleanvoice.fromEnv();

  const result = await client.process(
    'https://example.com/podcast.mp3',
    {
      fillers: true,
      normalize: true,
      summarize: true,
    },
    {
      polling: {
        onProgress: ({ status, progress }) => {
          const percentage = progress ? ` ${progress.done}%` : '';
          console.log(`Status: ${status}${percentage}`);
        },
      },
    }
  );

  console.log('Remote URL:', result.media.url);
  console.log('Summary:', result.transcript?.summary);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
