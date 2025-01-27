import { TimestreamWriteClient, WriteRecordsCommand, MeasureValueType, _Record } from "@aws-sdk/client-timestream-write";

class TimeStreamDB {
  private host: string;
  private region: string;
  private timestreamWrite: TimestreamWriteClient;

  constructor() {
    this.host = "host";
    this.region = "eu-west-1";
    this.timestreamWrite = new TimestreamWriteClient({ region: this.region });
  }

  async writeToTimestream(item: Record<string, any>): Promise<void | Record<string, any>> {
    item.host = this.host;
    item.region = this.region;

    const records: _Record[]  = Object.keys(item)
      .filter((key) => key !== "timestamp") // Exclude timestamp from being treated as a measure
      .map((key) => ({
        Dimensions: [
          { Name: "host", Value: item.host },
          { Name: "region", Value: item.region }
        ],
        MeasureName: key,
        MeasureValue: String(item[key]),
        MeasureValueType: this.getMeasureValueType(typeof item[key]) as MeasureValueType,
        Time: String(item.timestamp),
        TimeUnit: "SECONDS"
      }));

    // Skip processing if there are exactly 3 records
    if (records.length === 3) {
      return;
    }

    try {
      if (records.length > 0) {
        const command = new WriteRecordsCommand({
          DatabaseName: "data_monitoring",
          TableName: "pyth_and_exchange_rate_monitoring",
          Records: records
        });

        const response = await this.timestreamWrite.send(command);
        return response;
      }
    } catch (error) {
      console.error(`Error writing to Timestream: ${error}`);
    }
  }

  private getMeasureValueType(valueType: string): MeasureValueType {
    switch (valueType) {
      case "string":
        return MeasureValueType.VARCHAR;
      case "number":
        return Number.isInteger(valueType) ? MeasureValueType.BIGINT : MeasureValueType.DOUBLE;
      default:
        return MeasureValueType.VARCHAR;
    }
  }
}

export default TimeStreamDB;
