import sharp from "sharp";
import fs from "fs";
import path from "path";

async function packFile(filePath: string) {
  const extName = path.extname(filePath);
  const fileName = path.basename(filePath, extName);
  const relativeFolderPath = path
    .resolve(filePath, "..")
    .replace(path.resolve(process.argv[2]), "");

  const fileBuffer = Buffer.from(fs.readFileSync(filePath));

  try {
    // const resizedBlurry = await sharp(fileBuffer)
    //   .blur(1)
    //   .resize(30)
    //   .webp()
    //   .toBuffer();
    const outputFolder = path.join("./output", relativeFolderPath);
    if (!fs.existsSync(outputFolder)) {
      console.log("Making folder\t" + outputFolder);
      fs.mkdirSync(outputFolder);
    }
    const outputFilePath = path.join(
      // path.resolve(filePath, ".."),
      outputFolder,
      fileName + ".webp"
    );
    // fs.writeFileSync(outputFilePath, Buffer.from(resizedBlurry));

    const resizedWebp = await sharp(fileBuffer)
      .resize(1920)
      .webp()
      .toBuffer();

    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder);
    }
    fs.writeFileSync(outputFilePath, Buffer.from(resizedWebp));

    return {
      fileName,
      sizeBefore: fileBuffer.length,
      packedSize: 0, // resizedBlurry.length,
      webpSize: resizedWebp.length,
      percentImprovement:
        100 -
        (((resizedWebp.length / fileBuffer.length) * 10000) | 0) /
          100,
    };
  } catch (e) {
    return {
      fileName,
      sizeBefore: 0,
      packedSize: 0,
      webpSize: 0,
    };
  }
}

async function packDirectory(dir: string) {
  const files = fs.readdirSync(dir);
  const statistics: Promise<{
    fileName: string;
    sizeBefore: number;
    packedSize: number;
    webpSize: number;
  }>[] = [];

  for (const fileName of files) {
    const fullPath = path.join(dir, fileName);
    const stat = fs.statSync(fullPath);

    if (stat.isFile()) {
      const data = packFile(fullPath);
      statistics.push(data);
    } else {
      const t = await packDirectory(fullPath);
      statistics.push(...t);
    }
  }

  return statistics;
}

async function main() {
  if (process.argv.length < 3) {
    console.log("Usage: " + process.argv0 + " <input-file>");
    process.exit(1);
  }

  const filePath = process.argv[2];

  const stats = fs.statSync(filePath);

  if (!stats.isFile()) {
    console.log("packing directory");
    const tmp = await packDirectory(filePath);
    const data = await Promise.all(tmp);

    console.table(data);

    const aggregateBefore = data.reduce(
      (a, c) => a + c.sizeBefore,
      0
    );
    const aggregateAfter = data.reduce((a, c) => a + c.webpSize, 0);
    const improvementPercentage =
      100 - (((aggregateAfter / aggregateBefore) * 10000) | 0) / 100;

    console.log("Total size before:\t" + aggregateBefore);
    console.log("Total size after:\t" + aggregateAfter);
    console.log(
      "Improvement percentage:\t" + improvementPercentage + "%"
    );
  } else {
    console.log("packing file");
    const data = await packFile(filePath);
    console.table(data);
  }
}

main();
