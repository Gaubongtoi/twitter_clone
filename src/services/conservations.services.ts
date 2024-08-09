import { ObjectId } from 'mongodb'
import databaseService from './database.services'

class ConservationServices {
  async getConservation({
    sender_id,
    receiver_id,
    limit,
    page
  }: {
    sender_id: string
    receiver_id: string
    limit: number
    page: number
  }) {
    const match = {
      $or: [
        {
          sender_id: new ObjectId(sender_id),
          receiver_id: new ObjectId(receiver_id)
        },
        {
          sender_id: new ObjectId(receiver_id),
          receiver_id: new ObjectId(sender_id)
        }
      ]
    }
    const conservations = await databaseService.conservations
      .find(match)
      .sort({ created_at: -1 })
      .skip(limit * (page - 1))
      .limit(limit)
      .toArray()
    const total = await databaseService.conservations.countDocuments(match)
    return {
      conservations,
      total
    }
  }
}
const conservationService = new ConservationServices()
export default conservationService
