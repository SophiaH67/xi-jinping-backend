import { Citizen, CitizenModel } from '../schemas/User'

export const updateSocialCreditScore = async (
  citizen: Citizen,
  change: number
) => {
  console.log(
    `[SCORE] ${change < 0 ? 'took' : 'added'} ${
      change < 0 ? 0 - change : change
    } ${change < 0 ? 'from' : 'to'} ${
      citizen.citizenID
    }'s total. Total is now ${(citizen.socialCreditScore as number) + change}`
  )
  await CitizenModel.findOneAndUpdate(
    { _id: citizen.id },
    {
      // For some reason mongo queries
      // aren't in the type definitions
      // so this is a forced one.
      //@ts-expect-error
      $inc: { socialCreditScore: change },
    }
  )
}

export const getCitizen = async (id: string, discordID?: string) => {
  const citizen = await CitizenModel.findOne({ citizenID: parseInt(id) })
  if (!citizen) {
    const trackedCitizen = await CitizenModel.create({
      citizenID: id,
      discordID: discordID,
      socialCreditScore: 1000,
    })
    const newCitizen = await trackedCitizen.save()
    return newCitizen
  }
  // Add discordID to citizen if it doesn't exist
  if (discordID && !citizen.discordID) {
    citizen.discordID = discordID
    await citizen.save()
  }

  const log: { change: number }[] | undefined = JSON.parse(
    JSON.stringify(citizen)
  ).log
  if (log) {
    // Migrate user
    const socialCreditScore: number = log.reduce(
      // We have to use ts-ignore, because old
      // model isn't recognized by typescript
      //@ts-expect-error
      (acc, logItem) => acc.change || acc + logItem.change,
      1000
    )
    const migratedCitizen = await CitizenModel.create({
      citizenID: id,
      socialCreditScore: socialCreditScore,
    })
    await citizen.delete()
    return migratedCitizen
  }
  return citizen
}
