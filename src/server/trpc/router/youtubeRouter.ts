import { Configuration } from "openai";
import { OpenAIApi } from "openai/dist/api";
import puppeteer, { Browser } from "puppeteer";
import { z } from "zod";

import { publicProcedure, router } from "../trpc";

type VideoData = {
  title: string | null | undefined;
};

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export const youtubeRouter = router({
  youtube: publicProcedure
    .input(z.object({ topic: z.string(), alias: z.string() }))
    .mutation(async ({ input }) => {
      /**
       * Your puppeteer code goes here.
       * Learn how to use puppeteer to get this done within minutes:
       * @see https://www.youtube.com/watch?v=FKkDUW4E2Qc
       */
      const url = `https://youtube.com/${input.alias}/videos`;
      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(url);

      const videoTitles = await page.evaluate(() => {
        const videoTitleNodes = Array.from(
          document.querySelectorAll("#video-title")
        );
        return videoTitleNodes.map((node) => node.innerHTML);
      });

      await browser.close();

      const data: VideoData[] = videoTitles.map((title) => ({ title }));
      const titles = data.slice(0, 10); // Limit titles to last 10, not neccessary but keeps OpenAI cost low

      const prompt = `The following is a list of youtuve video titles. After reading the titles, you are given a topic to then write a smiliar title for.\n\nTITLES: ${titles
        .map((t) => t.title)
        .join(
          "\n"
        )}\n\nSIMILAR TITLE FOR TOPIC "${input.topic.toUpperCase()}":`;
      console.log(prompt);

      const res = await openai.createCompletion({
        model: "text-davinci-003",
        prompt,
        temperature: 1,
        max_tokens: 256,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      return res.data.choices[0]!.text;
    }),
});
