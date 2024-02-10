import { assert } from "./assert";
import { debug } from "debug";
import * as cheerio from "cheerio";
import { ethers } from "ethers";
const log = debug("send:multisigs");

export interface Multisig {
	heading: string;
	name: string;
	address: string;
}
export async function fetchMultisigsFromGitbook() {
	const response = await fetch("https://info.send.it/finance/multisigs");
	const text = await response.text();
	const $ = cheerio.load(text);

	const multisigs: Multisig[] = [];
	const headings: string[] = $("h3")
		.map((_, el) => $(el).text().trim())
		.toArray();

	log("Found headings:", headings.join(", "));

	$("table").each((tableIndex, table) => {
		const heading = headings[tableIndex];
		$(table)
			.find("tr")
			.each((index, row) => {
				if (index === 0) return; // Skip header row

				const cells = $(row).find("td");
				if (cells.length >= 2) {
					const name = $(cells[0]).text().trim();
					const address = ethers.getAddress(
						// remove any non-alphanumeric characters
						$(cells[1])
							.text()
							.trim()
							.replace(/\W/g, ""),
					);
					log(`Found multisig ${name} (${heading})`, address);

					multisigs.push({ heading, name, address });
				}
			});
	});

	assert(multisigs.length > 0, "No multisigs found");
	return multisigs;
}
